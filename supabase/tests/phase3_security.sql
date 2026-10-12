-- Run against a disposable Supabase development database AFTER the migration.
-- All fixtures are rolled back. With psql use -v ON_ERROR_STOP=1.
begin;

insert into auth.users(id, email, raw_user_meta_data, created_at, updated_at) values
  ('11111111-1111-4111-8111-111111111111', 'player-one@example.invalid', '{"display_name":"Player One","role":"admin"}', now(), now()),
  ('22222222-2222-4222-8222-222222222222', 'player-two@example.invalid', '{"full_name":"Google Player"}', now(), now()),
  ('33333333-3333-4333-8333-333333333333', 'admin-test@example.invalid', '{"display_name":"Trusted Admin"}', now(), now());
update public.profiles set contact_phone = '+94 770000000' where id = '22222222-2222-4222-8222-222222222222';
update public.profiles set role = 'admin' where id = '33333333-3333-4333-8333-333333333333';

insert into public.games(id,slug,title) values ('44444444-4444-4444-8444-444444444444','test-game','Test Game');
insert into public.events(id,slug,title,starts_at,ends_at,venue,is_published) values
 ('55555555-5555-4555-8555-555555555555','published-test','Published Test','2030-02-01T09:00:00+05:30','2030-02-01T20:00:00+05:30','Example venue',true),
 ('66666666-6666-4666-8666-666666666666','draft-test','Draft Test','2030-03-01T09:00:00+05:30','2030-03-01T20:00:00+05:30','Example venue',false);
insert into public.event_games(id,event_id,game_id,registration_type,starts_at,registration_opens_at,registration_closes_at) values
 ('77777777-7777-4777-8777-777777777777','55555555-5555-4555-8555-555555555555','44444444-4444-4444-8444-444444444444','team','2030-02-01T10:00:00+05:30','2030-01-01T09:00:00+05:30','2030-01-31T18:00:00+05:30');
insert into public.registrations(id,event_game_id,captain_id,created_by) values
 ('88888888-8888-4888-8888-888888888888','77777777-7777-4777-8777-777777777777','11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333');

do $$ begin
  if (select role from public.profiles where id = '11111111-1111-4111-8111-111111111111') <> 'player' then raise exception 'Metadata elevated role'; end if;
  if (select display_name from public.profiles where id = '22222222-2222-4222-8222-222222222222') <> 'Google Player' then raise exception 'Google profile missing'; end if;
  begin
    insert into public.registrations(event_game_id,captain_id,created_by) values
      ('77777777-7777-4777-8777-777777777777','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111');
    raise exception 'Duplicate active registration permitted';
  exception when unique_violation then null; end;
end $$;

set local role anon;
do $$ begin
  if (select count(*) from public.events where id = '55555555-5555-4555-8555-555555555555') <> 1 then raise exception 'Published event hidden'; end if;
  if (select count(*) from public.events where id = '66666666-6666-4666-8666-666666666666') <> 0 then raise exception 'Draft event leaked'; end if;
  if has_table_privilege(current_user,'public.profiles','SELECT') then raise exception 'Anonymous profile access'; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.profiles where id = '22222222-2222-4222-8222-222222222222') <> 0 then raise exception 'Another player contact leaked'; end if;
  if (select count(*) from public.registrations where id = '88888888-8888-4888-8888-888888888888') <> 0 then raise exception 'Registration accessible to player'; end if;
  if private.is_admin() then raise exception 'Player treated as admin'; end if;
  update public.profiles set display_name = 'Updated Player', contact_phone = '+94 711111111' where id = '11111111-1111-4111-8111-111111111111';
  if not found then raise exception 'Own profile update blocked'; end if;
  update public.profiles set display_name = 'Intrusion' where id = '22222222-2222-4222-8222-222222222222';
  if found then raise exception 'Other profile update allowed'; end if;
  begin
    update public.profiles set role = 'admin' where id = '11111111-1111-4111-8111-111111111111';
    raise exception 'Self role elevation allowed';
  exception when insufficient_privilege then null; end;
  if has_table_privilege(current_user,'public.registrations','INSERT') or has_table_privilege(current_user,'public.registrations','UPDATE') then raise exception 'Registration write grant'; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
set local role authenticated;
do $$ begin
  if not private.is_admin() then raise exception 'Trusted admin denied'; end if;
  if (select count(*) from public.profiles where id = '22222222-2222-4222-8222-222222222222') <> 1 then raise exception 'Admin profile access denied'; end if;
  if (select count(*) from public.registrations where id = '88888888-8888-4888-8888-888888888888') <> 1 then raise exception 'Admin registration read denied'; end if;
  if (select count(*) from public.events where id = '66666666-6666-4666-8666-666666666666') <> 1 then raise exception 'Admin draft read denied'; end if;
end $$;
reset role;

-- Altering event display/schedule metadata preserves the registration relationship.
update public.events set venue = 'Changed venue', starts_at = '2030-02-01T08:00:00+05:30', banner_url = 'https://example.invalid/versioned-banner.webp', banner_alt = 'Example banner'
  where id = '55555555-5555-4555-8555-555555555555';
do $$ begin
  if (select count(*) from public.registrations where id = '88888888-8888-4888-8888-888888888888') <> 1 then raise exception 'Metadata edit destroyed registration'; end if;
  begin
    delete from public.events where id = '55555555-5555-4555-8555-555555555555';
    raise exception 'Referenced event deleted';
  exception when foreign_key_violation then null; end;
end $$;
rollback;
