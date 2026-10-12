begin;
-- One scalar JSON result avoids PostgREST row caps and captures the entire
-- selected scope in one statement snapshot, including Auth owner emails.
create function public.admin_export_registrations(p_event uuid, p_competition uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  perform private.require_admin();
  if p_event is null then raise exception 'event_unavailable'; end if;
  with scope as materialized (
    select c.id,c.registration_type,g.title from public.event_games c
    join public.games g on g.id=c.game_id
    where c.event_id=p_event and (p_competition is null or c.id=p_competition)
  ), entries as materialized (
    select r.* from public.registrations r join scope c on c.id=r.event_game_id where r.status='active'
  ), roster as materialized (
    select p.* from public.registration_players p join entries r on r.id=p.registration_id
  ), totals as (
    select (select count(*) from entries) registrations,(select count(*) from roster) participants
  ), player_groups as (
    select p.registration_id,jsonb_agg(jsonb_build_object(
      'id',p.id,'fullName',p.display_name,'ign',p.ign,'gameId',p.game_player_id,'phone',p.contact_phone,
      'isCaptain',p.is_captain,'order',p.player_order
    ) order by p.is_captain desc,p.player_order,p.id) players from roster p group by p.registration_id
  ), registration_groups as (
    select r.event_game_id,jsonb_agg(jsonb_build_object(
      'id',r.id,'competitionId',r.event_game_id,'status',r.status,'source',r.source,
      'type',r.registration_type,'team',r.team_name,'clan',r.clan_name,'createdAt',r.created_at,
      'ownerEmail',case when r.source='player' then u.email else null end,
      'players',coalesce(p.players,'[]'::jsonb)
    ) order by r.created_at,r.id) registrations
    from entries r left join player_groups p on p.registration_id=r.id
    left join auth.users u on u.id=r.captain_id and r.source='player'
    group by r.event_game_id
  )
  select case when t.registrations>50000 or t.participants>50000 then jsonb_build_object('error','export_too_large')
    else jsonb_build_object('eventId',e.id,'eventTitle',e.title,'generatedAt',statement_timestamp(),
      'competitions',coalesce((select jsonb_agg(jsonb_build_object(
        'id',c.id,'title',c.title,'type',c.registration_type,'registrations',coalesce(r.registrations,'[]'::jsonb)
      ) order by lower(c.title),c.id) from scope c left join registration_groups r on r.event_game_id=c.id),'[]'::jsonb)) end
    into result from public.events e cross join totals t where e.id=p_event;
  if result is null then raise exception 'event_unavailable'; end if;
  if p_competition is not null and result->>'error' is null and jsonb_array_length(result->'competitions')=0 then raise exception 'competition_unavailable'; end if;
  return result;
end;
$$;
revoke all on function public.admin_export_registrations(uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_export_registrations(uuid,uuid) to authenticated;
commit;
