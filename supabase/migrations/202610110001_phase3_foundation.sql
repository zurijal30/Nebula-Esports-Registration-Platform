begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create type public.account_role as enum ('player', 'admin');
create type public.registration_type as enum ('solo', 'team');
create type public.event_status as enum ('scheduled', 'cancelled');
create type public.registration_status as enum ('active', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null default 'Player' check (char_length(display_name) between 2 and 80),
  contact_phone text check (contact_phone is null or contact_phone ~ '^[+0-9 ()-]{7,30}$'),
  role public.account_role not null default 'player',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue text not null,
  status public.event_status not null default 'scheduled',
  is_published boolean not null default false,
  banner_url text,
  banner_alt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_schedule_order check (ends_at > starts_at),
  constraint events_banner_pair check (
    (banner_url is null and banner_alt is null) or
    (banner_url is not null and char_length(banner_url) > 0 and banner_alt is not null and char_length(banner_alt) > 0)
  )
);

create table public.event_games (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  game_id uuid not null references public.games(id) on delete restrict,
  registration_type public.registration_type not null,
  starts_at timestamptz not null,
  registration_opens_at timestamptz not null,
  registration_closes_at timestamptz not null,
  venue_override text,
  -- Informational manual fee only. There is no payment status or collection.
  registration_fee_lkr numeric(12,2) not null default 0 check (registration_fee_lkr >= 0),
  field_definitions jsonb not null default '[]'::jsonb check (jsonb_typeof(field_definitions) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, game_id),
  constraint event_games_registration_order check (
    registration_opens_at < registration_closes_at and registration_closes_at <= starts_at
  )
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_game_id uuid not null references public.event_games(id) on delete restrict,
  captain_id uuid not null references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  team_name text,
  clan_name text,
  status public.registration_status not null default 'active',
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.registration_players (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete restrict,
  display_name text not null check (char_length(display_name) between 1 and 120),
  game_player_id text,
  contact_phone text,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index one_active_registration_per_captain_competition
  on public.registrations(captain_id, event_game_id) where status = 'active';
create index registrations_event_game_idx on public.registrations(event_game_id);
create index registrations_captain_idx on public.registrations(captain_id);
create index registrations_created_by_idx on public.registrations(created_by);
create index registration_players_registration_idx on public.registration_players(registration_id);
create index event_games_game_idx on public.event_games(game_id);
create index events_published_schedule_idx on public.events(starts_at) where is_published;

create function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger games_updated_at before update on public.games for each row execute function private.set_updated_at();
create trigger events_updated_at before update on public.events for each row execute function private.set_updated_at();
create trigger event_games_updated_at before update on public.event_games for each row execute function private.set_updated_at();
create trigger registrations_updated_at before update on public.registrations for each row execute function private.set_updated_at();
create trigger registration_players_updated_at before update on public.registration_players for each row execute function private.set_updated_at();

-- SECURITY DEFINER avoids recursive RLS when checking the trusted profile role.
create function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create function private.create_auth_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  proposed_name text;
begin
  proposed_name = left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', 'Player')), 80);
  if char_length(proposed_name) < 2 then proposed_name = 'Player'; end if;
  -- Never use role/contact fields from user-editable Auth metadata.
  insert into public.profiles(id, display_name, role, created_at)
    values (new.id, proposed_name, 'player', coalesce(new.created_at, now()));
  return new;
end;
$$;
revoke all on function private.create_auth_profile() from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.create_auth_profile();

-- Backfill existing Auth users without changing any existing profiles or roles.
insert into public.profiles(id, display_name, role, created_at)
select id, case
  when char_length(trim(coalesce(raw_user_meta_data ->> 'display_name', raw_user_meta_data ->> 'full_name', 'Player'))) < 2 then 'Player'
  else left(trim(coalesce(raw_user_meta_data ->> 'display_name', raw_user_meta_data ->> 'full_name', 'Player')), 80)
end, 'player', coalesce(created_at, now()) from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.events enable row level security;
alter table public.event_games enable row level security;
alter table public.registrations enable row level security;
alter table public.registration_players enable row level security;

-- Clear default grants. Row policies AND column privileges are required.
revoke all on public.profiles, public.games, public.events, public.event_games, public.registrations, public.registration_players from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, contact_phone) on public.profiles to authenticated;
create policy profiles_private_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));
create policy profiles_non_privileged_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));
-- No profile INSERT/DELETE or UPDATE(role/id/timestamps) via the public API.

grant select on public.games, public.events, public.event_games to anon, authenticated;
grant insert, update, delete on public.games, public.events, public.event_games to authenticated;
create policy games_public_read on public.games for select to anon, authenticated using (is_active);
create policy games_admin_manage on public.games for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy events_public_read on public.events for select to anon, authenticated using (is_published);
create policy events_admin_manage on public.events for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy event_games_public_read on public.event_games for select to anon, authenticated
  using (exists (select 1 from public.events where events.id = event_games.event_id and events.is_published));
create policy event_games_admin_manage on public.event_games for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Phase 3: no player reads or writes and no admin writes to registrations yet.
-- A later migration must add narrowly scoped server-workflow access.
grant select on public.registrations, public.registration_players to authenticated;
create policy registrations_admin_read on public.registrations for select to authenticated using ((select private.is_admin()));
create policy registration_players_admin_read on public.registration_players for select to authenticated using ((select private.is_admin()));

commit;
