-- Manual fixture for a disposable development project only. Run once after both migrations.
begin;
insert into public.games(slug,title) values ('phase4-test-solo','Phase 4 Test Solo'), ('phase4-test-team','Phase 4 Test Team');
insert into public.events(slug,title,description,starts_at,ends_at,venue,is_published)
values ('phase4-registration-test','Phase 4 Registration Test','Disposable integration fixture',
  now()+interval '2 days',now()+interval '3 days','Test venue',true);
insert into public.event_games(event_id,game_id,registration_type,starts_at,registration_opens_at,registration_closes_at)
select e.id,g.id,case when g.slug='phase4-test-solo' then 'solo'::public.registration_type else 'team'::public.registration_type end,
  now()+interval '2 days',now()-interval '1 day',now()+interval '1 day'
from public.events e cross join public.games g
where e.slug='phase4-registration-test' and g.slug in ('phase4-test-solo','phase4-test-team');
select eg.id,eg.registration_type from public.event_games eg join public.events e on e.id=eg.event_id where e.slug='phase4-registration-test';
commit;
