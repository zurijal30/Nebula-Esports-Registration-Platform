import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const admin = '33333333-3333-4333-8333-333333333333';
const solo = '44444444-4444-4444-8444-444444444444';
const team = '55555555-5555-4555-8555-555555555555';
const event = '66666666-6666-4666-8666-666666666666';
const players = (count = 1) => Array.from({ length: count }, (_, i) => ({ fullName: `Player ${i}`, ign: `IGN ${i}`, gameId: String(i), phone: '+94 711111111' }));

test('actual migrations and PostgreSQL registration authorization / atomicity', async (t) => {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}', created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;`);
  for (const file of ['202610110001_phase3_foundation.sql','202610110002_phase4_registration.sql']) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  await db.exec(`insert into auth.users(id) values ('${owner}'), ('${other}'), ('${admin}'); update public.profiles set role='admin' where id='${admin}';
    insert into games(id,slug,title) values ('77777777-7777-4777-8777-777777777777','solo','Solo'), ('88888888-8888-4888-8888-888888888888','team','Team');
    insert into events(id,slug,title,starts_at,ends_at,venue,is_published) values ('${event}','test-event','Test event',now()+interval '2 days',now()+interval '3 days','Venue',true);
    insert into event_games(id,event_id,game_id,registration_type,starts_at,registration_opens_at,registration_closes_at) values
      ('${solo}','${event}','77777777-7777-4777-8777-777777777777','solo',now()+interval '2 days',now()-interval '1 day',now()+interval '1 day'),
      ('${team}','${event}','88888888-8888-4888-8888-888888888888','team',now()+interval '2 days',now()-interval '1 day',now()+interval '1 day');`);
  const as = async (id, role = 'authenticated') => {
    await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]); await db.exec(`set role ${role}`);
  };
  const save = async (competition, roster, teamName = null, registration = null) => (await db.query('select public.save_registration($1,$2::jsonb,$3,null,$4) as id', [competition, JSON.stringify(roster), teamName, registration])).rows[0].id;
  const count = async (table) => Number((await db.query(`select count(*) as n from public.${table}`)).rows[0].n);
  let soloId, teamId;
  await as(owner);
  await t.test('solo creation derives owner/type/source and captain identity', async () => {
    soloId = await save(solo, players());
    const r = (await db.query('select * from public.registrations where id=$1', [soloId])).rows[0];
    assert.equal(r.captain_id, owner); assert.equal(r.created_by, owner); assert.equal(r.registration_type,'solo'); assert.equal(r.source,'player');
    assert.equal((await db.query('select is_captain from registration_players')).rows[0].is_captain,true);
  });
  await t.test('database unique index rejects duplicate and queued simultaneous submissions', async () => {
    await assert.rejects(save(solo, players()), { code: '23505' });
    // PGlite queues a single connection. This verifies duplicate SQL enforcement,
    // not cross-connection lock timing; the live two-client script covers that separately.
    const attempts = await Promise.allSettled([save(team, players(9), 'Team A'), save(team, players(9), 'Team A')]);
    assert.equal(attempts.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(attempts.find((r) => r.status === 'rejected').reason.code, '23505');
    teamId = attempts.find((r) => r.status === 'fulfilled').value;
    assert.equal(await count('registrations'),2); assert.equal(await count('registration_players'),10);
  });
  await t.test('team edits replace latest roster atomically without a fixed cap', async () => {
    await save(team, players(12), 'Updated Team', teamId);
    const roster = (await db.query('select * from registration_players where registration_id=$1 order by player_order', [teamId])).rows;
    assert.equal(roster.length,12); assert.equal(roster.filter((p) => p.is_captain).length,1); assert.equal(roster[0].player_order,0);
    assert.equal((await db.query('select team_name from registrations where id=$1', [teamId])).rows[0].team_name,'Updated Team');
  });
  await t.test('bad roster cannot partially create or edit; insertion failure rolls back deletes', async () => {
    await assert.rejects(save(team, [{ ...players()[0], ign: '' }], 'Bad', teamId), /invalid_players/);
    await db.exec('reset role');
    await db.exec(`create function private.fail_test_player() returns trigger language plpgsql as $$begin if new.ign='FAIL' then raise exception 'test insertion failure'; end if; return new; end;$$;
      create trigger fail_test before insert on registration_players for each row execute function private.fail_test_player();`);
    await as(owner);
    await assert.rejects(save(team, [{ ...players()[0], ign:'FAIL' }], 'Broken', teamId), /test insertion failure/);
    assert.equal((await db.query('select team_name from registrations where id=$1', [teamId])).rows[0].team_name,'Updated Team');
    assert.equal((await db.query('select count(*) as n from registration_players where registration_id=$1', [teamId])).rows[0].n,12);
    await as(other); await assert.rejects(save(solo, [{ ...players()[0], ign:'FAIL' }]), /test insertion failure/); assert.equal(await count('registrations'),0);
    await db.exec('reset role; drop trigger fail_test on registration_players; drop function private.fail_test_player();');
  });
  await t.test('RLS hides other owners and forbids direct writes or helper RPC execution', async () => {
    await as(other); assert.equal(await count('registrations'),0); assert.equal(await count('registration_players'),0);
    await assert.rejects(save(team, players(), 'Stolen', teamId), /registration_unavailable/);
    await assert.rejects(db.query('select cancel_registration($1)', [soloId]), /registration_unavailable/);
    await assert.rejects(db.exec(`update registrations set captain_id='${other}'`), { code:'42501' });
    await assert.rejects(db.query('select private.open_competition($1)',[solo]), { code:'42501' });
    await as('', 'anon'); await assert.rejects(save(solo, players()), { code:'42501' });
    await as('', 'authenticated'); await assert.rejects(save(solo, players()), /authentication_required/);
    await as(admin); assert.equal(await count('registrations'),2); assert.equal(await count('registration_players'),13);
  });
  await t.test('soft cancellation allows re-registration and rejects editing a cancelled entry', async () => {
    await as(owner); await db.query('select cancel_registration($1)',[soloId]);
    assert.equal((await db.query('select status from registrations where id=$1',[soloId])).rows[0].status,'cancelled');
    await assert.rejects(save(solo,players(),null,soloId), /registration_unavailable/);
    const newId = await save(solo,players()); assert.notEqual(newId,soloId); soloId = newId;
    assert.equal(await count('registrations'),3);
  });
  await t.test('database clock enforces opening and deadline for create/edit/cancel', async () => {
    await db.exec(`reset role; update event_games set registration_closes_at=clock_timestamp()-interval '1 second' where id='${solo}';`);
    await as(owner); await assert.rejects(save(solo,players(),null,soloId), /registration_closed/);
    await assert.rejects(db.query('select cancel_registration($1)',[soloId]), /registration_closed/);
    await as(other); await assert.rejects(save(solo,players()), /registration_closed/);
    await db.exec(`reset role; update event_games set registration_closes_at=clock_timestamp()+interval '1 day',registration_opens_at=clock_timestamp()+interval '1 hour' where id='${solo}';`);
    await as(other); await assert.rejects(save(solo,players()), /registration_not_open/);
    await db.exec(`reset role; update event_games set registration_opens_at=clock_timestamp()-interval '1 hour' where id='${solo}';`);
  });
  await t.test('long-running transaction cannot use its stale start time to bypass deadline', async () => {
    await db.exec(`reset role; update event_games set registration_closes_at=clock_timestamp()+interval '200 milliseconds' where id='${solo}';`);
    await as(owner); await db.exec('begin; select pg_sleep(0.3);');
    await assert.rejects(save(solo,players(),null,soloId), /registration_closed/);
    await db.exec('rollback; reset role;');
    await db.exec(`update event_games set registration_closes_at=clock_timestamp()+interval '1 day' where id='${solo}';`);
  });
  await t.test('draft/cancelled/inactive competitions and mismatched roster types fail closed', async () => {
    for (const [sql, undo] of [
      [`update events set is_published=false`, `update events set is_published=true`],
      [`update events set status='cancelled'`, `update events set status='scheduled'`],
      [`update event_games set status='cancelled'`, `update event_games set status='scheduled'`],
      [`update games set is_active=false`, `update games set is_active=true`],
    ]) { await db.exec('reset role'); await db.exec(sql); await as(other); await assert.rejects(save(solo,players()), /competition_unavailable/); await db.exec('reset role'); await db.exec(undo); }
    await as(other); await assert.rejects(save(solo,players(2)), /invalid_solo/); await assert.rejects(save(team,players(),null), /invalid_team/);
    assert.equal(await count('registrations'),0);
  });
  await db.close();
});
