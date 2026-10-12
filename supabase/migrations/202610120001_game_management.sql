begin;

-- Existing games retain an unspecified reference classification.
alter table public.games add column reference_type public.registration_type;
alter table public.games add column banner_url text;
alter table public.games add column banner_alt text;
alter table public.games add constraint games_banner_namespace check
  (banner_url is null or banner_url ~ '^/game-images/[0-9a-f-]{36}/[0-9a-f-]{36}$');

-- Cleanup receipts deliberately outlive a deleted game. No cascading records.
create table public.game_banner_assets (
  id uuid primary key default gen_random_uuid(), game_id uuid not null,
  path text not null unique, state text not null default 'pending' check(state in ('pending','active','retired','deleted')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index game_banner_assets_game_idx on public.game_banner_assets(game_id);
alter table public.game_banner_assets enable row level security;
revoke all on public.game_banner_assets from public,anon,authenticated;
grant select on public.game_banner_assets to anon,authenticated;
create policy game_assets_admin on public.game_banner_assets for select to authenticated using ((select private.is_admin()));
create policy game_assets_public on public.game_banner_assets for select to anon,authenticated using (
  state='active' and (
    exists(select 1 from public.games g where g.is_active and g.banner_url='/game-images/'||game_banner_assets.game_id::text||'/'||game_banner_assets.id::text)
    or exists(select 1 from public.events e where e.is_published and e.banner_url='/game-images/'||game_banner_assets.game_id::text||'/'||game_banner_assets.id::text)
  )
);

-- Preserve the old RPC for existing callers. The new RPC has a distinct name
-- to avoid ambiguous PostgREST overloads and does not change competitions.
create function public.admin_save_game_details(p_title text,p_slug text,p_active boolean,p_reference text,p_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare result_id uuid;
begin
  perform private.require_admin();
  if p_title is null or char_length(trim(p_title)) not between 1 and 120
    or p_active is null or (p_reference is not null and p_reference not in ('solo','team')) then raise exception 'invalid_game'; end if;
  if p_id is null then
    insert into public.games(title,slug,is_active,reference_type)
      values(trim(p_title),p_slug,p_active,p_reference::public.registration_type) returning id into result_id;
  else
    update public.games set title=trim(p_title),is_active=p_active,reference_type=p_reference::public.registration_type
      where id=p_id returning id into result_id;
    if result_id is null then raise exception 'game_unavailable'; end if;
  end if;
  return result_id;
end;
$$;

create function public.admin_reserve_game_banner(p_game uuid)
returns public.game_banner_assets language plpgsql security definer set search_path='' as $$
declare actor uuid; asset public.game_banner_assets; asset_id uuid:=gen_random_uuid();
begin
  actor:=private.require_admin();
  perform 1 from public.games where id=p_game for share;
  if not found then raise exception 'game_unavailable'; end if;
  insert into public.game_banner_assets(id,game_id,path,created_by)
    values(asset_id,p_game,p_game::text||'/'||asset_id::text||'.webp',actor) returning * into asset;
  return asset;
end;
$$;

create function public.admin_set_game_banner(p_game uuid,p_asset uuid default null,p_alt text default null)
returns void language plpgsql security definer set search_path='' as $$
declare asset public.game_banner_assets;
begin
  perform private.require_admin();
  perform 1 from public.games where id=p_game for update;
  if not found then raise exception 'game_unavailable'; end if;
  if p_asset is not null then
    select * into asset from public.game_banner_assets where id=p_asset and game_id=p_game and state='pending' for update;
    if not found or not exists(select 1 from storage.objects where bucket_id='nebula-game-banners' and name=asset.path) then raise exception 'banner_unavailable'; end if;
    if p_alt is null or char_length(trim(p_alt)) not between 1 and 240 then raise exception 'invalid_banner_alt'; end if;
  end if;
  -- Shared URLs may keep a retired image alive until their final reference ends.
  update public.game_banner_assets set state='retired' where game_id=p_game and state='active';
  update public.games set banner_url=case when p_asset is null then null else '/game-images/'||p_game::text||'/'||p_asset::text end,
    banner_alt=case when p_asset is null then null else trim(p_alt) end where id=p_game;
  if p_asset is not null then update public.game_banner_assets set state='active' where id=p_asset; end if;
  update public.game_banner_assets a set state='active' where game_id=p_game and state='retired' and (
    exists(select 1 from public.games g where g.banner_url='/game-images/'||a.game_id::text||'/'||a.id::text)
    or exists(select 1 from public.events e where e.banner_url='/game-images/'||a.game_id::text||'/'||a.id::text));
end;
$$;

create function public.admin_delete_game(p_game uuid,p_confirmation text)
returns void language plpgsql security definer set search_path='' as $$
declare selected public.games;
begin
  perform private.require_admin();
  if p_game is null or p_confirmation is null then raise exception 'invalid_game_confirmation'; end if;
  select * into selected from public.games where id=p_game for update;
  if not found then raise exception 'game_unavailable'; end if;
  if p_confirmation<>selected.title then raise exception 'invalid_game_confirmation'; end if;
  -- FK RESTRICT also protects against concurrent competition insertion.
  -- Every registration/historical record points through event_games.
  if exists(select 1 from public.event_games where game_id=p_game) then raise exception 'game_is_referenced'; end if;
  delete from public.games where id=p_game;
  update public.game_banner_assets a set state='retired' where game_id=p_game and state<>'deleted'
    and not exists(select 1 from public.games g where g.banner_url='/game-images/'||a.game_id::text||'/'||a.id::text)
    and not exists(select 1 from public.events e where e.banner_url='/game-images/'||a.game_id::text||'/'||a.id::text);
end;
$$;

create function public.admin_unused_game_banners()
returns table(path text) language plpgsql security definer set search_path='' as $$
begin
  perform private.require_admin();
  update public.game_banner_assets set state='retired' where state='pending' and created_at<clock_timestamp()-interval '1 hour';
  update public.game_banner_assets a set state='retired' where state='active'
    and not exists(select 1 from public.games g where g.banner_url='/game-images/'||a.game_id::text||'/'||a.id::text)
    and not exists(select 1 from public.events e where e.banner_url='/game-images/'||a.game_id::text||'/'||a.id::text);
  return query select a.path from public.game_banner_assets a where state='retired'
    and not exists(select 1 from public.games g where g.banner_url='/game-images/'||a.game_id::text||'/'||a.id::text)
    and not exists(select 1 from public.events e where e.banner_url='/game-images/'||a.game_id::text||'/'||a.id::text);
end;
$$;
create function public.admin_finish_game_banner_cleanup(p_path text)
returns boolean language plpgsql security definer set search_path='' as $$
declare completed boolean;
begin
  perform private.require_admin();
  update public.game_banner_assets a set state='deleted' where path=p_path and state='retired'
    and not exists(select 1 from storage.objects o where o.bucket_id='nebula-game-banners' and o.name=a.path)
    and not exists(select 1 from public.games g where g.banner_url='/game-images/'||a.game_id::text||'/'||a.id::text)
    and not exists(select 1 from public.events e where e.banner_url='/game-images/'||a.game_id::text||'/'||a.id::text) returning true into completed;
  return coalesce(completed,exists(select 1 from public.game_banner_assets where path=p_path and state='deleted'));
end;
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('nebula-game-banners','nebula-game-banners',false,5242880,array['image/webp']);
create function private.game_banner_allowed(p_path text,p_operation text)
returns boolean language sql stable security definer set search_path='' as $$
  select case p_operation
    when 'read' then exists(select 1 from public.game_banner_assets a where a.path=p_path and (
      private.is_admin() or (a.state='active' and (
        exists(select 1 from public.games g where g.is_active and g.banner_url='/game-images/'||a.game_id::text||'/'||a.id::text)
        or exists(select 1 from public.events e where e.is_published and e.banner_url='/game-images/'||a.game_id::text||'/'||a.id::text)))))
    when 'insert' then private.is_admin() and exists(select 1 from public.game_banner_assets a where a.path=p_path and a.state='pending' and a.created_by=auth.uid())
    when 'delete' then private.is_admin() and exists(select 1 from public.game_banner_assets a where a.path=p_path and a.state='retired'
      and not exists(select 1 from public.games g where g.banner_url='/game-images/'||a.game_id::text||'/'||a.id::text)
      and not exists(select 1 from public.events e where e.banner_url='/game-images/'||a.game_id::text||'/'||a.id::text))
    else false end;
$$;
revoke all on function private.game_banner_allowed(text,text) from public,anon,authenticated;
grant execute on function private.game_banner_allowed(text,text) to anon,authenticated;
create policy game_banner_read on storage.objects for select to anon,authenticated using(bucket_id='nebula-game-banners' and private.game_banner_allowed(name,'read'));
create policy game_banner_insert on storage.objects for insert to authenticated with check(bucket_id='nebula-game-banners' and private.game_banner_allowed(name,'insert'));
create policy game_banner_delete on storage.objects for delete to authenticated using(bucket_id='nebula-game-banners' and private.game_banner_allowed(name,'delete'));
create policy game_banner_read_boundary on storage.objects as restrictive for select to anon,authenticated using(bucket_id<>'nebula-game-banners' or private.game_banner_allowed(name,'read'));
create policy game_banner_insert_boundary on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'nebula-game-banners' or private.game_banner_allowed(name,'insert'));
create policy game_banner_anon_insert_boundary on storage.objects as restrictive for insert to anon with check(bucket_id<>'nebula-game-banners');
create policy game_banner_update_boundary on storage.objects as restrictive for update to anon,authenticated using(bucket_id<>'nebula-game-banners') with check(bucket_id<>'nebula-game-banners');
create policy game_banner_delete_boundary on storage.objects as restrictive for delete to authenticated using(bucket_id<>'nebula-game-banners' or private.game_banner_allowed(name,'delete'));
create policy game_banner_anon_delete_boundary on storage.objects as restrictive for delete to anon using(bucket_id<>'nebula-game-banners');

create function private.check_game_banner_reservation()
returns trigger language plpgsql security definer set search_path='' as $$
declare asset public.game_banner_assets; actor uuid;
begin
  if new.bucket_id<>'nebula-game-banners' then return new; end if;
  actor:=private.require_admin();
  select * into asset from public.game_banner_assets where path=new.name for share;
  if not found or asset.state<>'pending' or asset.created_by<>actor then raise exception 'banner_unavailable'; end if;
  return new;
end;
$$;
revoke all on function private.check_game_banner_reservation() from public,anon,authenticated;
create trigger game_banner_reservation_check before insert on storage.objects for each row execute function private.check_game_banner_reservation();

revoke all on function public.admin_save_game_details(text,text,boolean,text,uuid),public.admin_delete_game(uuid,text),
  public.admin_reserve_game_banner(uuid),public.admin_set_game_banner(uuid,uuid,text),public.admin_unused_game_banners(),public.admin_finish_game_banner_cleanup(text) from public,anon,authenticated;
grant execute on function public.admin_save_game_details(text,text,boolean,text,uuid),public.admin_delete_game(uuid,text),
  public.admin_reserve_game_banner(uuid),public.admin_set_game_banner(uuid,uuid,text),public.admin_unused_game_banners(),public.admin_finish_game_banner_cleanup(text) to authenticated;
commit;
