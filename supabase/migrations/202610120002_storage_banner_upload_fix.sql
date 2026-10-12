begin;

-- Storage probes RLS as the caller, then persists the object as service_role.
-- Its internal transaction has no player auth.uid(). Validate the explicit
-- object owner against the pending reservation instead. Do not use JWT role
-- claims to decide whether this is the trusted internal database role.
create or replace function private.check_game_banner_reservation()
returns trigger language plpgsql security definer set search_path='' as $$
declare asset public.game_banner_assets; actor uuid;
begin
  if new.bucket_id<>'nebula-game-banners' then return new; end if;
  select * into asset from public.game_banner_assets where path=new.name for share;
  if not found or asset.state<>'pending' then raise exception 'banner_unavailable'; end if;
  if current_setting('role',true)='service_role' then
    actor:=coalesce(nullif(to_jsonb(new)->>'owner_id',''),nullif(to_jsonb(new)->>'owner',''))::uuid;
    if actor is null or actor<>asset.created_by then raise exception 'banner_unavailable'; end if;
    perform 1 from public.profiles where id=actor and role='admin' for share;
    if not found then raise exception 'admin_required'; end if;
  else
    actor:=private.require_admin();
    if actor<>asset.created_by then raise exception 'banner_unavailable'; end if;
  end if;
  return new;
end;
$$;

-- Event banners use the same reservation guard and need the same compatibility
-- fix. Existing bucket configuration, image references and policies are kept.
create or replace function private.check_banner_upload_reservation()
returns trigger language plpgsql security definer set search_path='' as $$
declare asset public.event_banner_assets; actor uuid;
begin
  if new.bucket_id<>'nebula-event-banners' then return new; end if;
  select * into asset from public.event_banner_assets where path=new.name for share;
  if not found or asset.state<>'pending' then raise exception 'banner_unavailable'; end if;
  if current_setting('role',true)='service_role' then
    actor:=coalesce(nullif(to_jsonb(new)->>'owner_id',''),nullif(to_jsonb(new)->>'owner',''))::uuid;
    if actor is null or actor<>asset.created_by then raise exception 'banner_unavailable'; end if;
    perform 1 from public.profiles where id=actor and role='admin' for share;
    if not found then raise exception 'admin_required'; end if;
  else
    actor:=private.require_admin();
    if actor<>asset.created_by then raise exception 'banner_unavailable'; end if;
  end if;
  return new;
end;
$$;
revoke all on function private.check_game_banner_reservation(),private.check_banner_upload_reservation() from public,anon,authenticated;
commit;
