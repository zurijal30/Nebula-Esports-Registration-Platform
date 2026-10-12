// Explicit opt-in: this creates and soft-cancels entries in a DISPOSABLE test project.
// No service-role key, SQL reset, permanent delete, or credential output.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../src/lib/auth/config.ts';
try { process.loadEnvFile('.env.test.local'); } catch { /* environment supplied */ }
const required = ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','PHASE4_TEST_EMAIL','PHASE4_TEST_PASSWORD','PHASE4_TEST_SOLO_ID','PHASE4_TEST_TEAM_ID'];
if (process.env.PHASE4_ALLOW_TEST_WRITES !== 'YES_DISPOSABLE_PROJECT' || required.some((key) => !process.env[key])) {
  console.log('SKIP live authenticated tests: configure a disposable project, test account, competition IDs, and explicit write opt-in.');
  process.exit(0);
}
const config = getSupabaseConfig(); if (!config) throw new Error('Invalid public configuration');
const client = () => createClient(config.url, config.key, { auth: { persistSession:false, autoRefreshToken:false } });
const a = client(), b = client(), anonymous = client();
for (const c of [a,b]) {
  const { error } = await c.auth.signInWithPassword({ email:process.env.PHASE4_TEST_EMAIL, password:process.env.PHASE4_TEST_PASSWORD });
  assert.equal(error,null,'Disposable test account must be confirmed and sign-in must succeed');
}
const roster = (n) => Array.from({length:n}, (_,i) => ({fullName:`Integration Player ${i+1}`, ign:`TestIGN${i+1}`, gameId:`TEST-${i+1}`,phone:'+94 711111111'}));
const save = (c,id,players,name=null,registration=null) => c.rpc('save_registration',{p_competition:id,p_players:players,p_team:name,p_clan:null,p_registration:registration});
const created = new Set();
try {
  const { error: schemaError } = await a.from('registrations').select('id,registration_type,source').limit(0);
  assert.equal(schemaError,null,'Apply both migrations before running live tests');
  const solo = process.env.PHASE4_TEST_SOLO_ID, team = process.env.PHASE4_TEST_TEAM_ID;
  for (const id of [solo,team]) {
    const { data,error } = await a.from('registrations').select('id').eq('event_game_id',id).eq('status','active');
    assert.equal(error,null); assert.equal(data.length,0,'Use fresh test competitions with no active entries for the test owner');
  }
  const anon = await save(anonymous,solo,roster(1)); assert.equal(anon.error?.code,'42501');
  const invalid = await save(a,solo,[{...roster(1)[0],ign:''}]); assert.ok(invalid.error);
  const first = await save(a,solo,roster(1)); assert.equal(first.error,null); created.add(first.data);
  const edit = await save(a,solo,[{...roster(1)[0],ign:'UpdatedIGN'}],null,first.data); assert.equal(edit.error,null);
  const failedEdit = await save(a,solo,[{...roster(1)[0],phone:''}],null,first.data); assert.ok(failedEdit.error);
  const saved = await a.from('registration_players').select('ign').eq('registration_id',first.data); assert.equal(saved.data[0].ign,'UpdatedIGN');
  console.log('PASS live solo save/edit and failed-edit atomicity');
  const race = await Promise.all([save(a,team,roster(9),'Integration Team'),save(b,team,roster(9),'Integration Team')]);
  for (const result of race) if (!result.error) created.add(result.data);
  assert.equal(race.filter((r)=>!r.error).length,1); assert.equal(race.find((r)=>r.error).error.code,'23505');
  const teamId = race.find((r)=>!r.error).data;
  assert.equal((await save(a,team,roster(12),'Edited Team',teamId)).error,null);
  const members = await a.from('registration_players').select('player_order,is_captain').eq('registration_id',teamId);
  assert.equal(members.data.length,12); assert.equal(members.data.filter((p)=>p.is_captain).length,1);
  console.log('PASS live two-session race protection and 12-player team edit');
  assert.equal((await a.rpc('cancel_registration',{p_registration:first.data})).error,null); created.delete(first.data);
  assert.ok((await save(a,solo,roster(1),null,first.data)).error);
  const again = await save(a,solo,roster(1)); assert.equal(again.error,null); assert.notEqual(again.data,first.data); created.add(again.data);
  console.log('PASS live cancellation and re-registration');
  if (process.env.PHASE4_OTHER_EMAIL && process.env.PHASE4_OTHER_PASSWORD) {
    const other = client(); assert.equal((await other.auth.signInWithPassword({email:process.env.PHASE4_OTHER_EMAIL,password:process.env.PHASE4_OTHER_PASSWORD})).error,null);
    const hidden = await other.from('registrations').select('id').eq('id',teamId); assert.equal(hidden.data.length,0);
    assert.ok((await save(other,team,roster(1),'Stolen',teamId)).error);
    assert.ok((await other.rpc('cancel_registration',{p_registration:teamId})).error);
    await other.auth.signOut({scope:'local'}); console.log('PASS live other-owner denial');
  } else console.log('SKIP live other-owner test: second disposable player not configured');
  if (process.env.PHASE4_TEST_CLOSED_ID) {
    const closed = await save(a,process.env.PHASE4_TEST_CLOSED_ID,roster(1)); assert.equal(closed.error?.message,'registration_closed');
    console.log('PASS live database deadline enforcement');
  } else console.log('SKIP live closed-window test: closed solo competition not configured');
} finally {
  for (const id of created) {
    const {error} = await a.rpc('cancel_registration',{p_registration:id});
    if (error) console.log('Test cleanup could not soft-cancel an entry; inspect the disposable project (its window may have closed).');
  }
  await Promise.all([a.auth.signOut({scope:'local'}),b.auth.signOut({scope:'local'})]);
}
