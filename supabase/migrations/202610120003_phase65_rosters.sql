begin;
alter table public.games add column max_team_size integer check(max_team_size>0);
alter table public.games add column available_roles text[];
alter table public.games add constraint game_roles_valid check(available_roles is null or (
  cardinality(available_roles)>0 and array_position(available_roles,null) is null
  and available_roles <@ array['coach','player_1','player_2','player_3','player_4','player_5','substitute_1','substitute_2']::text[]
  and available_roles && array['player_1','player_2','player_3','player_4','player_5']::text[]));
alter table public.registration_players add column participant_role text
  check(participant_role in ('coach','player_1','player_2','player_3','player_4','player_5','substitute_1','substitute_2'));
alter table public.registration_players add constraint captain_gameplay_role check(participant_role is null or not is_captain or participant_role like 'player_%');
create unique index unique_registration_role on public.registration_players(registration_id,participant_role) where participant_role is not null;

-- Historical roles remain null. The user's selected default for new/edited
-- teams is eight individuals with the eight named roles; no data is backfilled.
create function private.validate_game_roster(p_game uuid,p_type public.registration_type,p_players jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare g public.games; p jsonb; assigned text[]:=array[]::text[]; chosen text; position integer:=0; maximum integer; roles text[];
begin
  if p_type='solo' then
    if exists(select 1 from jsonb_array_elements(p_players) as participant(value) where nullif(participant.value->>'role','') is not null) then raise exception 'invalid_participant_role'; end if;
    return;
  end if;
  select * into g from public.games where id=p_game for share;
  if not found then raise exception 'competition_unavailable'; end if;
  maximum:=coalesce(g.max_team_size,8);
  roles:=coalesce(g.available_roles,array['coach','player_1','player_2','player_3','player_4','player_5','substitute_1','substitute_2']);
  if jsonb_array_length(p_players)>maximum then raise exception 'roster_maximum:%',maximum; end if;
  for p in select value from jsonb_array_elements(p_players) loop
    chosen:=p->>'role';
    if jsonb_typeof(p->'role') is distinct from 'string' or chosen is null or not(chosen=any(roles)) then raise exception 'invalid_participant_role'; end if;
    if chosen=any(assigned) then raise exception 'duplicate_participant_role'; end if;
    if position=0 and chosen not in ('player_1','player_2','player_3','player_4','player_5') then raise exception 'invalid_captain_role'; end if;
    assigned:=array_append(assigned,chosen);position:=position+1;
  end loop;
end;
$$;
revoke all on function private.validate_game_roster(uuid,public.registration_type,jsonb) from public,anon,authenticated;

create function public.admin_save_game_config(p_title text,p_slug text,p_active boolean,p_reference text,
  p_max integer,p_roles text[],p_confirm boolean default false,p_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid; affected bigint; previous public.games;
begin
  perform private.require_admin();
  if p_max is not null and p_max<1 then raise exception 'invalid_roster_config'; end if;
  if p_roles is not null and (cardinality(p_roles)<1 or array_position(p_roles,null) is not null
    or not(p_roles <@ array['coach','player_1','player_2','player_3','player_4','player_5','substitute_1','substitute_2']::text[])
    or not(p_roles && array['player_1','player_2','player_3','player_4','player_5']::text[])
    or cardinality(p_roles)<>(select count(distinct role) from unnest(p_roles) role)) then raise exception 'invalid_roster_config'; end if;
  if p_id is not null then
    select * into previous from public.games where id=p_id for update;
    if not found then raise exception 'game_unavailable'; end if;
    if previous.max_team_size is distinct from p_max or previous.available_roles is distinct from p_roles then
      select count(*) into affected from public.registrations r join public.event_games c on c.id=r.event_game_id
        where c.game_id=p_id and r.registration_type='team' and (
          (select count(*) from public.registration_players p where p.registration_id=r.id)>coalesce(p_max,8)
          or (p_roles is not null and exists(select 1 from public.registration_players p where p.registration_id=r.id and p.participant_role is not null and not(p.participant_role=any(p_roles)))));
      if affected>0 and not coalesce(p_confirm,false) then raise exception 'roster_change_confirmation'; end if;
    end if;
  end if;
  result_id:=public.admin_save_game_details(p_title,p_slug,p_active,p_reference,p_id);
  update public.games set max_team_size=p_max,available_roles=p_roles where id=result_id;
  return result_id;
end;
$$;
revoke all on function public.admin_save_game_config(text,text,boolean,text,integer,text[],boolean,uuid) from public,anon,authenticated;
grant execute on function public.admin_save_game_config(text,text,boolean,text,integer,text[],boolean,uuid) to authenticated;

create or replace function private.validate_roster(p_type public.registration_type, p_team text, p_clan text, p_players jsonb)
returns void language plpgsql set search_path = '' as $$
declare p jsonb;
begin
  if jsonb_typeof(p_players) is distinct from 'array' or jsonb_array_length(p_players) < 1 then raise exception 'invalid_players'; end if;
  if p_type = 'solo' and (jsonb_array_length(p_players) <> 1 or nullif(trim(p_team), '') is not null) then raise exception 'invalid_solo'; end if;
  if p_type = 'team' and (p_team is null or char_length(trim(p_team)) not between 1 and 120) then raise exception 'invalid_team'; end if;
  if p_clan is not null and char_length(trim(p_clan)) > 120 then raise exception 'invalid_clan'; end if;
  for p in select value from jsonb_array_elements(p_players) loop
    if jsonb_typeof(p) is distinct from 'object'
      or jsonb_typeof(p->'fullName') is distinct from 'string' or char_length(trim(p->>'fullName')) not between 1 and 120
      or jsonb_typeof(p->'ign') is distinct from 'string' or char_length(trim(p->>'ign')) not between 1 and 120
      or jsonb_typeof(p->'gameId') is distinct from 'string' or char_length(trim(p->>'gameId')) not between 1 and 120
      or jsonb_typeof(p->'phone') is distinct from 'string' or trim(p->>'phone') !~ '^[+0-9 ()-]{7,30}$'
    then raise exception 'invalid_players'; end if;
  end loop;
end;
$$;

create or replace function public.save_registration(p_competition uuid, p_players jsonb, p_team text default null, p_clan text default null, p_registration uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); c public.event_games; r public.registrations; result_id uuid;
begin
  if owner_id is null or not exists (select 1 from public.profiles where id = owner_id) then raise exception 'authentication_required'; end if;
  if p_registration is not null then
    select * into r from public.registrations where id = p_registration and captain_id = owner_id for update;
    if not found then raise exception 'registration_unavailable'; end if;
    if r.status <> 'active' or r.event_game_id <> p_competition then raise exception 'registration_unavailable'; end if;
  end if;
  c := private.open_competition(p_competition);
  if p_registration is not null and r.registration_type <> c.registration_type then raise exception 'competition_type_changed'; end if;
  perform private.validate_roster(c.registration_type, p_team, p_clan, p_players);
  perform private.validate_game_roster(c.game_id,c.registration_type,p_players);
  if p_registration is null then
    insert into public.registrations(event_game_id, captain_id, created_by, registration_type, source, team_name, clan_name)
    values (c.id, owner_id, owner_id, c.registration_type, 'player', nullif(trim(p_team), ''), nullif(trim(p_clan), '')) returning id into result_id;
  else
    result_id := r.id;
    update public.registrations set team_name = nullif(trim(p_team), ''), clan_name = nullif(trim(p_clan), '') where id = result_id;
    delete from public.registration_players where registration_id = result_id;
  end if;
  insert into public.registration_players(registration_id, display_name, ign, game_player_id, contact_phone, player_order, is_captain, participant_role)
  select result_id, trim(value->>'fullName'), trim(value->>'ign'), trim(value->>'gameId'), trim(value->>'phone'), ordinality - 1, ordinality = 1, nullif(value->>'role','')
  from jsonb_array_elements(p_players) with ordinality;
  -- Re-check clock at completion too. An exception rolls back the entire RPC, including roster replacement.
  perform private.open_competition(c.id);
  return result_id;
end;
$$;

create or replace function public.admin_save_registration(p_competition uuid, p_players jsonb, p_team text default null, p_clan text default null, p_registration uuid default null, p_request uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid; c public.event_games; r public.registrations; result_id uuid;
begin
  actor := private.require_admin();
  if p_registration is not null then
    select * into r from public.registrations where id=p_registration for update;
    if not found or r.event_game_id <> p_competition then raise exception 'registration_unavailable'; end if;
  end if;
  select * into c from public.event_games where id=p_competition for share;
  if not found then raise exception 'competition_unavailable'; end if;
  -- Administrators may operate after deadlines, or on drafts/cancelled events.
  perform private.validate_roster(c.registration_type,p_team,p_clan,p_players);
  perform private.validate_game_roster(c.game_id,c.registration_type,p_players);
  if p_registration is null then
    if p_request is null then raise exception 'request_required'; end if;
    insert into public.registrations(event_game_id,captain_id,created_by,registration_type,source,team_name,clan_name,manual_request_id)
    values(c.id,null,actor,c.registration_type,'admin',nullif(trim(p_team),''),nullif(trim(p_clan),''),p_request)
    on conflict(manual_request_id) do nothing returning id into result_id;
    if result_id is null then
      select id into result_id from public.registrations where manual_request_id=p_request and created_by=actor and event_game_id=c.id;
      if result_id is null then raise exception 'request_conflict'; end if;
      return result_id; -- retry returns the existing entry; never edits/restores it.
    end if;
  else
    if r.registration_type <> c.registration_type then raise exception 'competition_type_changed'; end if;
    result_id := r.id;
    update public.registrations set team_name=nullif(trim(p_team),''),clan_name=nullif(trim(p_clan),'') where id=result_id;
    delete from public.registration_players where registration_id=result_id;
  end if;
  insert into public.registration_players(registration_id,display_name,ign,game_player_id,contact_phone,player_order,is_captain,participant_role)
  select result_id,trim(value->>'fullName'),trim(value->>'ign'),trim(value->>'gameId'),trim(value->>'phone'),ordinality-1,ordinality=1,nullif(value->>'role','') from jsonb_array_elements(p_players) with ordinality;
  return result_id;
end;
$$;

create or replace function public.admin_export_registrations(p_event uuid, p_competition uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  perform private.require_admin();
  if p_event is null then raise exception 'event_unavailable'; end if;
  with scope as materialized (
    select c.id,c.registration_type,g.title,g.max_team_size from public.event_games c
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
      'participantRole',p.participant_role,'isCaptain',p.is_captain,'order',p.player_order
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
        'id',c.id,'title',c.title,'type',c.registration_type,'maxTeamSize',case when c.registration_type='team' then coalesce(c.max_team_size,8) else null end,'registrations',coalesce(r.registrations,'[]'::jsonb)
      ) order by lower(c.title),c.id) from scope c left join registration_groups r on r.event_game_id=c.id),'[]'::jsonb)) end
    into result from public.events e cross join totals t where e.id=p_event;
  if result is null then raise exception 'event_unavailable'; end if;
  if p_competition is not null and result->>'error' is null and jsonb_array_length(result->'competitions')=0 then raise exception 'competition_unavailable'; end if;
  return result;
end;
$$;
commit;
