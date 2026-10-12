begin;

-- Manual entries have no Auth owner. Existing player entries keep their owner and unique index.
alter table public.registrations alter column captain_id drop not null;
alter table public.registrations add column manual_request_id uuid unique;
alter table public.registrations add constraint registration_owner_model check (captain_id is not null or source = 'admin');
create unique index games_title_case_unique on public.games(lower(trim(title)));

create function private.require_admin()
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  -- Role demotion waits for an already-authorized operation to finish.
  perform 1 from public.profiles where id = actor and role = 'admin' for share;
  if not found then raise exception 'admin_required'; end if;
  return actor;
end;
$$;
revoke all on function private.require_admin() from public, anon, authenticated;

-- All mutations now pass through validated functions. Keep existing read policies.
revoke insert, update, delete on public.events, public.event_games, public.games from authenticated;

create function public.admin_save_event(p_values jsonb, p_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result_id uuid; v public.events;
begin
  perform private.require_admin();
  v.title := trim(p_values->>'title'); v.description := coalesce(p_values->>'description','');
  v.slug := p_values->>'slug'; v.venue := trim(p_values->>'venue');
  v.starts_at := (p_values->>'starts_at')::timestamptz; v.ends_at := (p_values->>'ends_at')::timestamptz;
  v.status := (p_values->>'status')::public.event_status; v.is_published := (p_values->>'is_published')::boolean;
  if char_length(v.venue) not between 1 and 240 or char_length(v.description) > 10000 then raise exception 'invalid_event'; end if;
  if p_id is null then
    insert into public.events(slug,title,description,venue,starts_at,ends_at,status,is_published)
    values (v.slug,v.title,v.description,v.venue,v.starts_at,v.ends_at,v.status,v.is_published) returning id into result_id;
  else
    -- Slug is immutable after creation: public URLs must keep working.
    update public.events set title=v.title,description=v.description,venue=v.venue,starts_at=v.starts_at,ends_at=v.ends_at,status=v.status,is_published=v.is_published where id=p_id returning id into result_id;
    if result_id is null then raise exception 'event_unavailable'; end if;
  end if;
  return result_id;
end;
$$;

create function public.admin_save_game(p_title text, p_slug text, p_active boolean, p_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result_id uuid;
begin
  perform private.require_admin();
  if p_id is null then
    insert into public.games(title,slug,is_active) values(trim(p_title),p_slug,p_active) returning id into result_id;
  else
    update public.games set title=trim(p_title),is_active=p_active where id=p_id returning id into result_id;
    if result_id is null then raise exception 'game_unavailable'; end if;
  end if;
  return result_id;
end;
$$;

create function public.admin_save_competition(p_event uuid, p_values jsonb, p_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result_id uuid; v public.event_games; previous public.event_games; parent public.events;
begin
  perform private.require_admin();
  -- Match player workflow lock order: competition first, then event.
  if p_id is not null then
    select * into previous from public.event_games where id=p_id and event_id=p_event for update;
    if not found then raise exception 'competition_unavailable'; end if;
  end if;
  select * into parent from public.events where id=p_event for share;
  if not found then raise exception 'event_unavailable'; end if;
  v.game_id := (p_values->>'game_id')::uuid; v.registration_type := (p_values->>'registration_type')::public.registration_type;
  v.registration_opens_at := (p_values->>'registration_opens_at')::timestamptz;
  v.registration_closes_at := (p_values->>'registration_closes_at')::timestamptz;
  v.starts_at := coalesce(nullif(p_values->>'starts_at','')::timestamptz,parent.starts_at);
  v.venue_override := nullif(trim(p_values->>'venue_override'),'');
  v.registration_fee_lkr := coalesce(nullif(p_values->>'registration_fee_lkr','')::numeric,0);
  v.status := (p_values->>'status')::public.event_status;
  if char_length(v.venue_override)>240 then raise exception 'invalid_competition'; end if;
  if p_id is not null and (previous.game_id <> v.game_id or previous.registration_type <> v.registration_type)
    and exists(select 1 from public.registrations where event_game_id=p_id) then raise exception 'competition_has_registrations'; end if;
  if p_id is null then
    insert into public.event_games(event_id,game_id,registration_type,starts_at,registration_opens_at,registration_closes_at,venue_override,registration_fee_lkr,status)
    values(p_event,v.game_id,v.registration_type,v.starts_at,v.registration_opens_at,v.registration_closes_at,v.venue_override,v.registration_fee_lkr,v.status) returning id into result_id;
  else
    update public.event_games set game_id=v.game_id,registration_type=v.registration_type,starts_at=v.starts_at,registration_opens_at=v.registration_opens_at,registration_closes_at=v.registration_closes_at,venue_override=v.venue_override,registration_fee_lkr=v.registration_fee_lkr,status=v.status where id=p_id returning id into result_id;
  end if;
  return result_id;
end;
$$;

create function public.admin_save_registration(p_competition uuid, p_players jsonb, p_team text default null, p_clan text default null, p_registration uuid default null, p_request uuid default null)
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
  insert into public.registration_players(registration_id,display_name,ign,game_player_id,contact_phone,player_order,is_captain)
  select result_id,trim(value->>'fullName'),trim(value->>'ign'),trim(value->>'gameId'),trim(value->>'phone'),ordinality-1,ordinality=1 from jsonb_array_elements(p_players) with ordinality;
  return result_id;
end;
$$;

create function public.admin_cancel_registration(p_registration uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  update public.registrations set status='cancelled' where id=p_registration;
  if not found then raise exception 'registration_unavailable'; end if;
  return p_registration;
end;
$$;

create function public.admin_list_users()
returns table(id uuid, display_name text, email text, role public.account_role, contact_phone text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query select p.id,p.display_name,u.email::text,p.role,p.contact_phone,p.created_at from public.profiles p join auth.users u on u.id=p.id order by p.created_at desc,p.id;
end;
$$;

create function public.admin_overview()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return jsonb_build_object('events',(select count(*) from public.events),'published',(select count(*) from public.events where is_published),
    'upcoming',(select count(*) from public.events where status='scheduled' and starts_at>clock_timestamp()),
    'active',(select count(*) from public.registrations where status='active'),'cancelled',(select count(*) from public.registrations where status='cancelled'),
    'players',(select count(*) from public.profiles where role='player'));
end;
$$;
revoke all on function public.admin_overview() from public,anon,authenticated;
grant execute on function public.admin_overview() to authenticated;

create function public.admin_change_role(p_user uuid, p_role public.account_role)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid;
begin
  -- Serialize role changes BEFORE authorization; concurrent demotions cannot remove all admins.
  perform pg_advisory_xact_lock(508110003);
  actor := private.require_admin();
  if p_user=actor then raise exception 'self_role_change'; end if;
  perform 1 from public.profiles where id=p_user for update;
  if not found then raise exception 'user_unavailable'; end if;
  if p_role='player' and (select role from public.profiles where id=p_user)='admin'
    and (select count(*) from public.profiles where role='admin') <= 1 then raise exception 'last_admin'; end if;
  update public.profiles set role=p_role where id=p_user;
end;
$$;

-- Guards also apply to trusted SQL edits, without granting client role-update privileges.
create function private.protect_last_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(508110003);
  if old.role='admin' and (tg_op='DELETE' or new.role<>'admin') and (select count(*) from public.profiles where role='admin')<=1 then raise exception 'last_admin'; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.protect_last_admin() from public,anon,authenticated;
create trigger profiles_last_admin before update of role on public.profiles for each row execute function private.protect_last_admin();
create trigger profiles_last_admin_delete before delete on public.profiles for each row execute function private.protect_last_admin();

create table public.event_banner_assets (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete restrict,
  path text not null unique, state text not null default 'pending' check(state in ('pending','active','retired','deleted')),
  created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now()
);
alter table public.event_banner_assets enable row level security;
revoke all on public.event_banner_assets from public,anon,authenticated;
grant select on public.event_banner_assets to anon,authenticated;
create policy banner_assets_admin on public.event_banner_assets for select to authenticated using ((select private.is_admin()));
create policy banner_assets_published on public.event_banner_assets for select to anon,authenticated using (
  state='active' and exists(select 1 from public.events e where e.id=event_banner_assets.event_id and e.is_published and e.banner_url='/event-images/'||event_banner_assets.event_id::text||'/'||event_banner_assets.id::text)
);
create index event_banner_assets_event_idx on public.event_banner_assets(event_id);

create function public.admin_reserve_banner(p_event uuid)
returns public.event_banner_assets language plpgsql security definer set search_path = '' as $$
declare actor uuid; asset public.event_banner_assets; asset_id uuid := gen_random_uuid();
begin
  actor := private.require_admin();
  if not exists(select 1 from public.events where id=p_event) then raise exception 'event_unavailable'; end if;
  insert into public.event_banner_assets(id,event_id,path,created_by) values(asset_id,p_event,p_event::text||'/'||asset_id::text||'.webp',actor) returning * into asset;
  return asset;
end;
$$;

create function public.admin_set_banner(p_event uuid, p_asset uuid default null, p_alt text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare selected public.event_banner_assets; e public.events;
begin
  perform private.require_admin();
  select * into e from public.events where id=p_event for update;
  if not found then raise exception 'event_unavailable'; end if;
  if p_asset is not null then
    select * into selected from public.event_banner_assets where id=p_asset and event_id=p_event and state='pending' for update;
    if not found or not exists(select 1 from storage.objects where bucket_id='nebula-event-banners' and name=selected.path) then raise exception 'banner_unavailable'; end if;
    if char_length(trim(p_alt)) not between 1 and 240 or p_alt is null then raise exception 'invalid_banner_alt'; end if;
  end if;
  update public.event_banner_assets set state='retired' where event_id=p_event and state='active';
  if p_asset is null then
    update public.events set banner_url=null,banner_alt=null where id=p_event;
  else
    update public.event_banner_assets set state='active' where id=p_asset;
    update public.events set banner_url='/event-images/'||p_event::text||'/'||p_asset::text,banner_alt=trim(p_alt) where id=p_event;
  end if;
end;
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('nebula-event-banners','nebula-event-banners',false,5242880,array['image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy nebula_banner_read on storage.objects for select to anon,authenticated using (
  bucket_id='nebula-event-banners' and exists(select 1 from public.event_banner_assets a where a.path=name)
);
create policy nebula_banner_upload on storage.objects for insert to authenticated with check (
  bucket_id='nebula-event-banners' and (select private.is_admin()) and exists(select 1 from public.event_banner_assets a where a.path=name and a.state='pending' and a.created_by=(select auth.uid()))
);
-- Immutable unique uploads: no UPDATE policy, no overwrite. Delete only unreferenced retired/stale pending objects.
create policy nebula_banner_delete on storage.objects for delete to authenticated using (
  bucket_id='nebula-event-banners' and (select private.is_admin()) and exists(select 1 from public.event_banner_assets a where a.path=name
    and a.state='retired'
    and not exists(select 1 from public.events e where e.banner_url='/event-images/'||a.event_id::text||'/'||a.id::text))
);

-- Restrictive bucket boundaries prevent unrelated permissive Storage policies from granting access.
create policy nebula_banner_read_boundary on storage.objects as restrictive for select to anon,authenticated using (
  bucket_id<>'nebula-event-banners' or exists(select 1 from public.event_banner_assets a where a.path=name)
);
create policy nebula_banner_insert_boundary on storage.objects as restrictive for insert to authenticated with check (
  bucket_id<>'nebula-event-banners' or ((select private.is_admin()) and exists(select 1 from public.event_banner_assets a where a.path=name and a.state='pending' and a.created_by=(select auth.uid())))
);
create policy nebula_banner_anon_insert_boundary on storage.objects as restrictive for insert to anon with check(bucket_id<>'nebula-event-banners');
create policy nebula_banner_update_boundary on storage.objects as restrictive for update to anon,authenticated using(bucket_id<>'nebula-event-banners') with check(bucket_id<>'nebula-event-banners');
create policy nebula_banner_delete_boundary on storage.objects as restrictive for delete to authenticated using (
  bucket_id<>'nebula-event-banners' or ((select private.is_admin()) and exists(select 1 from public.event_banner_assets a where a.path=name and a.state='retired'
    and not exists(select 1 from public.events e where e.banner_url='/event-images/'||a.event_id::text||'/'||a.id::text)))
);
create policy nebula_banner_anon_delete_boundary on storage.objects as restrictive for delete to anon using(bucket_id<>'nebula-event-banners');

create function public.admin_unused_banners()
returns table(path text) language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  -- Mark expired uploads retired before deletion, so they cannot race activation.
  update public.event_banner_assets set state='retired' where state='pending' and created_at<clock_timestamp()-interval '1 hour';
  return query select a.path from public.event_banner_assets a where a.state='retired'
    and not exists(select 1 from public.events e where e.banner_url='/event-images/'||a.event_id::text||'/'||a.id::text);
end;
$$;
revoke all on function public.admin_unused_banners() from public,anon,authenticated;
grant execute on function public.admin_unused_banners() to authenticated;

create function public.admin_finish_banner_cleanup(p_path text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare completed boolean;
begin
  perform private.require_admin();
  update public.event_banner_assets a set state='deleted' where a.path=p_path and a.state='retired'
    and not exists(select 1 from storage.objects o where o.bucket_id='nebula-event-banners' and o.name=a.path)
    and not exists(select 1 from public.events e where e.banner_url='/event-images/'||a.event_id::text||'/'||a.id::text) returning true into completed;
  return coalesce(completed,exists(select 1 from public.event_banner_assets where path=p_path and state='deleted'));
end;
$$;
revoke all on function public.admin_finish_banner_cleanup(text) from public,anon,authenticated;
grant execute on function public.admin_finish_banner_cleanup(text) to authenticated;

-- Public change counter reveals no event/user data and includes unpublication changes.
create table public.event_public_refresh(id boolean primary key default true check(id), version bigint not null default 0);
insert into public.event_public_refresh(id) values(true);
alter table public.event_public_refresh enable row level security;
revoke all on public.event_public_refresh from public,anon,authenticated;
grant select on public.event_public_refresh to anon,authenticated;
create policy refresh_public_read on public.event_public_refresh for select to anon,authenticated using(true);
create function private.refresh_public_events()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.event_public_refresh set version=version+1 where id=true;
  return null;
end;
$$;
revoke all on function private.refresh_public_events() from public,anon,authenticated;
create trigger events_public_refresh after insert or update or delete on public.events for each statement execute function private.refresh_public_events();
create trigger competitions_public_refresh after insert or update or delete on public.event_games for each statement execute function private.refresh_public_events();
create trigger games_public_refresh after insert or update or delete on public.games for each statement execute function private.refresh_public_events();
do $$begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='event_public_refresh') then
    alter publication supabase_realtime add table public.event_public_refresh;
  end if;
end;$$;

revoke all on function public.admin_save_event(jsonb,uuid), public.admin_save_game(text,text,boolean,uuid), public.admin_save_competition(uuid,jsonb,uuid), public.admin_save_registration(uuid,jsonb,text,text,uuid,uuid), public.admin_cancel_registration(uuid), public.admin_list_users(), public.admin_change_role(uuid,public.account_role), public.admin_reserve_banner(uuid), public.admin_set_banner(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.admin_save_event(jsonb,uuid), public.admin_save_game(text,text,boolean,uuid), public.admin_save_competition(uuid,jsonb,uuid), public.admin_save_registration(uuid,jsonb,text,text,uuid,uuid), public.admin_cancel_registration(uuid), public.admin_list_users(), public.admin_change_role(uuid,public.account_role), public.admin_reserve_banner(uuid), public.admin_set_banner(uuid,uuid,text) to authenticated;
commit;
