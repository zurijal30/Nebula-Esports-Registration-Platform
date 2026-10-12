begin;

-- A shared event image must stay readable after its original event replaces or
-- removes it. Retire only images with no remaining event reference.
create or replace function public.admin_set_banner(p_event uuid, p_asset uuid default null, p_alt text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare selected public.event_banner_assets; e public.events;
begin
  perform private.require_admin();
  select * into e from public.events where id=p_event for update;
  if not found then raise exception 'event_unavailable'; end if;
  if p_asset is not null then
    select * into selected from public.event_banner_assets where id=p_asset and event_id=p_event and state='pending' for update;
    if not found or not exists(select 1 from storage.objects where bucket_id='nebula-event-banners' and name=selected.path) then raise exception 'banner_unavailable'; end if;
    if p_alt is null or char_length(trim(p_alt)) not between 1 and 240 then raise exception 'invalid_banner_alt'; end if;
  end if;
  update public.event_banner_assets set state='retired' where event_id=p_event and state='active';
  if p_asset is null then
    update public.events set banner_url=null,banner_alt=null where id=p_event;
  else
    update public.event_banner_assets set state='active' where id=p_asset;
    update public.events set banner_url='/event-images/'||p_event::text||'/'||p_asset::text,banner_alt=trim(p_alt) where id=p_event;
  end if;
  update public.event_banner_assets a set state='active' where event_id=p_event and state='retired'
    and exists(select 1 from public.events referenced where referenced.banner_url='/event-images/'||a.event_id::text||'/'||a.id::text);
end;
$$;
revoke all on function public.admin_set_banner(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.admin_set_banner(uuid,uuid,text) to authenticated;

create or replace function public.admin_unused_banners()
returns table(path text) language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  update public.event_banner_assets set state='retired'
    where state='pending' and created_at<clock_timestamp()-interval '1 hour';
  -- Once the last shared reference ends, the original event can still exist.
  -- Retire unreferenced active assets regardless of their owner's existence.
  update public.event_banner_assets a set state='retired' where state='active'
    and not exists(select 1 from public.events e where e.banner_url='/event-images/'||a.event_id::text||'/'||a.id::text);
  return query select a.path from public.event_banner_assets a where state='retired'
    and not exists(select 1 from public.events e where e.banner_url='/event-images/'||a.event_id::text||'/'||a.id::text);
end;
$$;
revoke all on function public.admin_unused_banners() from public,anon,authenticated;
grant execute on function public.admin_unused_banners() to authenticated;

-- Repair previously retired shared images without changing event URLs, image
-- objects, registrations or ownership. Pending/deleted assets remain unchanged.
update public.event_banner_assets a set state='active' where state='retired'
  and exists(select 1 from public.events e where e.banner_url='/event-images/'||a.event_id::text||'/'||a.id::text);

commit;
