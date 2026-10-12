begin;

alter table public.event_games add column status public.event_status not null default 'scheduled';

alter table public.registrations add column registration_type public.registration_type;
update public.registrations r set registration_type = eg.registration_type from public.event_games eg where eg.id = r.event_game_id;
alter table public.registrations alter column registration_type set not null;
alter table public.registrations add column source text not null default 'player' check (source in ('player', 'admin'));
update public.registrations set source = 'admin' where created_by <> captain_id;
alter table public.registration_players add column ign text;
alter table public.registration_players add column player_order integer;
alter table public.registration_players add column is_captain boolean not null default false;
with ordered as (
  select id, row_number() over (partition by registration_id order by created_at, id) - 1 as position from public.registration_players
) update public.registration_players p set player_order = o.position, is_captain = o.position = 0 from ordered o where o.id = p.id;
alter table public.registration_players alter column player_order set not null;
alter table public.registration_players add constraint player_order_nonnegative check (player_order >= 0);
alter table public.registration_players add constraint player_order_unique unique (registration_id, player_order);
create unique index one_captain_per_registration on public.registration_players(registration_id) where is_captain;

create policy registrations_owner_read on public.registrations for select to authenticated using (captain_id = (select auth.uid()));
create policy registration_players_owner_read on public.registration_players for select to authenticated using (
  exists (select 1 from public.registrations r where r.id = registration_id and r.captain_id = (select auth.uid()))
);
-- Preserve admin read policies. No direct table writes, even for authenticated admins.
revoke insert, update, delete on public.registrations, public.registration_players from anon, authenticated;

-- Shared locks serialize eligibility changes against submissions without serializing different players.
-- clock_timestamp is checked AFTER waiting for locks; a stale transaction start cannot bypass a deadline.
create function private.open_competition(p_competition uuid)
returns public.event_games language plpgsql security definer set search_path = '' as $$
declare c public.event_games; e public.events; g public.games; checked_at timestamptz;
begin
  select * into c from public.event_games where id = p_competition for share;
  if not found then raise exception 'competition_unavailable'; end if;
  select * into e from public.events where id = c.event_id for share;
  select * into g from public.games where id = c.game_id for share;
  checked_at := clock_timestamp();
  if not e.is_published or e.status <> 'scheduled' or c.status <> 'scheduled' or not g.is_active then raise exception 'competition_unavailable'; end if;
  if checked_at < c.registration_opens_at then raise exception 'registration_not_open'; end if;
  if checked_at >= c.registration_closes_at or checked_at >= e.ends_at or checked_at >= c.starts_at then raise exception 'registration_closed'; end if;
  return c;
end;
$$;
revoke all on function private.open_competition(uuid) from public, anon, authenticated;

create function private.validate_roster(p_type public.registration_type, p_team text, p_clan text, p_players jsonb)
returns void language plpgsql set search_path = '' as $$
declare p jsonb;
begin
  if jsonb_typeof(p_players) is distinct from 'array' or jsonb_array_length(p_players) < 1 then raise exception 'invalid_players'; end if;
  if p_type = 'solo' and (jsonb_array_length(p_players) <> 1 or nullif(trim(p_team), '') is not null or nullif(trim(p_clan), '') is not null) then raise exception 'invalid_solo'; end if;
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
revoke all on function private.validate_roster(public.registration_type, text, text, jsonb) from public, anon, authenticated;

create function public.save_registration(p_competition uuid, p_players jsonb, p_team text default null, p_clan text default null, p_registration uuid default null)
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
  if p_registration is null then
    insert into public.registrations(event_game_id, captain_id, created_by, registration_type, source, team_name, clan_name)
    values (c.id, owner_id, owner_id, c.registration_type, 'player', nullif(trim(p_team), ''), nullif(trim(p_clan), '')) returning id into result_id;
  else
    result_id := r.id;
    update public.registrations set team_name = nullif(trim(p_team), ''), clan_name = nullif(trim(p_clan), '') where id = result_id;
    delete from public.registration_players where registration_id = result_id;
  end if;
  insert into public.registration_players(registration_id, display_name, ign, game_player_id, contact_phone, player_order, is_captain)
  select result_id, trim(value->>'fullName'), trim(value->>'ign'), trim(value->>'gameId'), trim(value->>'phone'), ordinality - 1, ordinality = 1
  from jsonb_array_elements(p_players) with ordinality;
  -- Re-check clock at completion too. An exception rolls back the entire RPC, including roster replacement.
  perform private.open_competition(c.id);
  return result_id;
end;
$$;
revoke all on function public.save_registration(uuid, jsonb, text, text, uuid) from public, anon, authenticated;
grant execute on function public.save_registration(uuid, jsonb, text, text, uuid) to authenticated;

create function public.cancel_registration(p_registration uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); r public.registrations; c public.event_games;
begin
  if owner_id is null then raise exception 'authentication_required'; end if;
  select * into r from public.registrations where id = p_registration and captain_id = owner_id for update;
  if not found or r.status <> 'active' then raise exception 'registration_unavailable'; end if;
  c := private.open_competition(r.event_game_id);
  update public.registrations set status = 'cancelled' where id = r.id;
  perform private.open_competition(c.id);
  return r.id;
end;
$$;
revoke all on function public.cancel_registration(uuid) from public, anon, authenticated;
grant execute on function public.cancel_registration(uuid) to authenticated;

commit;
