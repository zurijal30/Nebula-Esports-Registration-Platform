begin;

-- Keep owned asset paths as cleanup receipts after their event is gone.
-- No cascading foreign keys: every tournament record is deleted explicitly.
alter table public.event_banner_assets drop constraint event_banner_assets_event_id_fkey;

-- Preserve a banner if another published event explicitly references its URL.
drop policy banner_assets_published on public.event_banner_assets;
create policy banner_assets_published on public.event_banner_assets for select to anon,authenticated using (
  state='active' and exists(select 1 from public.events e where e.is_published
    and e.banner_url='/event-images/'||event_banner_assets.event_id::text||'/'||event_banner_assets.id::text)
);

create or replace function public.admin_reserve_banner(p_event uuid)
returns public.event_banner_assets language plpgsql security definer set search_path = '' as $$
declare actor uuid; asset public.event_banner_assets; asset_id uuid := gen_random_uuid();
begin
  actor := private.require_admin();
  perform 1 from public.events where id=p_event for share;
  if not found then raise exception 'event_unavailable'; end if;
  insert into public.event_banner_assets(id,event_id,path,created_by)
    values(asset_id,p_event,p_event::text||'/'||asset_id::text||'.webp',actor) returning * into asset;
  return asset;
end;
$$;

create function public.admin_delete_event(p_event uuid, p_confirmation text)
returns text[] language plpgsql security definer set search_path = '' as $$
declare selected public.events; paths text[];
begin
  perform private.require_admin();
  if p_event is null or p_confirmation is null then raise exception 'invalid_delete_confirmation'; end if;
  -- Serialize writes while collecting and removing dependants, including new entries
  -- and pending uploads. Existing operations either finish first or wait.
  lock table public.events, public.event_games, public.registrations,
    public.registration_players, public.event_banner_assets, storage.objects in share row exclusive mode;
  select * into selected from public.events where id=p_event for update;
  if not found then raise exception 'event_unavailable'; end if;
  if p_confirmation <> selected.title then raise exception 'invalid_delete_confirmation'; end if;

  delete from public.registration_players p using public.registrations r, public.event_games c
    where p.registration_id=r.id and r.event_game_id=c.id and c.event_id=p_event;
  delete from public.registrations r using public.event_games c
    where r.event_game_id=c.id and c.event_id=p_event;
  delete from public.event_games where event_id=p_event;
  delete from public.events where id=p_event;

  update public.event_banner_assets a set state='retired'
    where a.event_id=p_event and a.state<>'deleted'
    and not exists(select 1 from public.events e where e.banner_url='/event-images/'||a.event_id::text||'/'||a.id::text);
  select coalesce(array_agg(a.path),array[]::text[]) into paths from public.event_banner_assets a
    where a.event_id=p_event and a.state='retired'
    and not exists(select 1 from public.events e where e.banner_url='/event-images/'||a.event_id::text||'/'||a.id::text);
  return paths;
end;
$$;
revoke all on function public.admin_delete_event(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_delete_event(uuid,text) to authenticated;

-- Recheck the latest asset state under a row lock, even when an upload began
-- before deletion and its statement snapshot saw the old pending reservation.
create function private.check_banner_upload_reservation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare asset public.event_banner_assets; actor uuid;
begin
  if new.bucket_id<>'nebula-event-banners' then return new; end if;
  actor := private.require_admin();
  select * into asset from public.event_banner_assets where path=new.name for share;
  if not found or asset.state<>'pending' or asset.created_by<>actor then raise exception 'banner_unavailable'; end if;
  return new;
end;
$$;
revoke all on function private.check_banner_upload_reservation() from public,anon,authenticated;
create trigger nebula_banner_reservation_check before insert on storage.objects
  for each row execute function private.check_banner_upload_reservation();

create or replace function public.admin_unused_banners()
returns table(path text) language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  update public.event_banner_assets set state='retired'
    where state='pending' and created_at<clock_timestamp()-interval '1 hour';
  -- A shared banner may outlive its owner. Retire it only after its final
  -- reference is removed, so orphan cleanup remains possible later.
  update public.event_banner_assets a set state='retired' where a.state='active'
    and not exists(select 1 from public.events e where e.id=a.event_id)
    and not exists(select 1 from public.events e where e.banner_url='/event-images/'||a.event_id::text||'/'||a.id::text);
  return query select a.path from public.event_banner_assets a where a.state='retired'
    and not exists(select 1 from public.events e where e.banner_url='/event-images/'||a.event_id::text||'/'||a.id::text);
end;
$$;
commit;
