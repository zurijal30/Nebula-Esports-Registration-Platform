import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import ExcelJS from 'exceljs';
import {createExportWorkbook} from '../src/lib/admin/export-workbook.ts';
import {PARTICIPANT_ROLES,validateTeamRoster} from '../src/lib/registrations/roster-rules.ts';
const admin='11111111-1111-4111-8111-111111111111',owner='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333';
const roles=['player_1','player_2','player_3','player_4','player_5','coach','substitute_1','substitute_2'];
const people=(n,withRoles=true)=>Array.from({length:n},(_,i)=>({fullName:`Person ${i}`,ign:`IGN ${i}`,gameId:`000${i}`,phone:'0771234567',...(withRoles?{role:roles[i]}:{})}));
test('Phase 6.5 actual migrations: clans, roles, maximums, atomicity and export compatibility',async(t)=>{
  const db=new PGlite();
  try{
    await db.exec(`create role anon;create role authenticated;create schema auth;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',created_at timestamptz default now());
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
      create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,unique(bucket_id,name));
      alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;
      grant select,insert,update,delete on storage.objects to anon,authenticated;create publication supabase_realtime;`);
    for(const name of ['202610110001_phase3_foundation.sql','202610110002_phase4_registration.sql','202610110003_phase5_admin.sql','202610110004_admin_event_deletion.sql','202610110005_phase6_excel_exports.sql','202610120001_game_management.sql','202610120002_storage_banner_upload_fix.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8'));
    await db.exec(`insert into auth.users(id,email)values('${admin}','admin@example.invalid'),('${owner}','owner@example.invalid'),('${other}','other@example.invalid');update profiles set role='admin' where id='${admin}';`);
    const as=async(id,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec(`set role ${role}`);};
    const rpc=async(name,args=[])=>(await db.query(`select public.${name}(${args.map((_,i)=>`$${i+1}`).join(',')}) result`,args)).rows[0].result;
    const now=Date.now(),start=new Date(now+86400000).toISOString();
    await as(admin);
    const event=await rpc('admin_save_event',[{title:'Clan Arena',slug:'clan-arena',venue:'Colombo',starts_at:start,ends_at:new Date(now+172800000).toISOString(),is_published:true,status:'scheduled'},null]);
    const game=await rpc('admin_save_game',['VALORANT','valorant',true,null]);
    const ff=await rpc('admin_save_game',['Free Fire','free-fire',true,null]);
    const soloGame=await rpc('admin_save_game',['Tekken','tekken',true,null]);
    const values=(id,type)=>({game_id:id,registration_type:type,starts_at:start,registration_opens_at:new Date(now-3600000).toISOString(),registration_closes_at:new Date(now+3600000).toISOString(),registration_fee_lkr:0,status:'scheduled'});
    const team=await rpc('admin_save_competition',[event,values(game,'team'),null]),solo=await rpc('admin_save_competition',[event,values(soloGame,'solo'),null]),freeFire=await rpc('admin_save_competition',[event,values(ff,'team'),null]);
    const legacy=await rpc('admin_save_registration',[team,people(12,false),'Historical',null,null,'44444444-4444-4444-8444-444444444444']);
    const before=(await db.query('select * from registration_players where registration_id=$1 order by player_order',[legacy])).rows;
    await db.exec('reset role');await db.exec(await readFile(new URL('../supabase/migrations/202610120003_phase65_rosters.sql',import.meta.url),'utf8'));await as(admin);
    let soloEntry,teamEntry,manual;
    await t.test('migration preserves oversized legacy rosters and never invents role assignments',async()=>{
      const after=(await db.query('select * from registration_players where registration_id=$1 order by player_order',[legacy])).rows;
      assert.equal(after.length,12);for(let i=0;i<12;i++){assert.equal(after[i].id,before[i].id);assert.equal(after[i].ign,before[i].ign);assert.equal(after[i].participant_role,null);}
      const snapshot=await rpc('admin_export_registrations',[event,team]);const wb=new ExcelJS.Workbook();await wb.xlsx.load(await createExportWorkbook(snapshot));assert.equal(wb.worksheets[0].getCell('E9').value,'Unassigned');
      await assert.rejects(rpc('admin_save_registration',[team,people(12,false),'Historical',null,legacy,null]),/roster_maximum:8/);
    });
    await t.test('optional solo clan creation/edit and ownership/deadline checks remain authoritative',async()=>{
      await as(owner);soloEntry=await rpc('save_registration',[solo,people(1,false),null,'Nebula Clan',null]);
      assert.equal((await db.query('select clan_name,registration_type from registrations where id=$1',[soloEntry])).rows[0].clan_name,'Nebula Clan');
      await rpc('save_registration',[solo,people(1,false),null,'Edited Clan',soloEntry]);
      await as(other);await assert.rejects(rpc('save_registration',[solo,people(1,false),null,'Stolen',soloEntry]),/registration_unavailable/);
      const independent=await rpc('save_registration',[solo,people(1,false),null,null,null]);assert.equal((await db.query('select clan_name from registrations where id=$1',[independent])).rows[0].clan_name,null);
      await as(owner);await assert.rejects(rpc('save_registration',[solo,people(1),null,'Clan',soloEntry]),/invalid_participant_role/);
    });
    const configure=(id,title,max,enabled=PARTICIPANT_ROLES,confirm=false)=>rpc('admin_save_game_config',[title,title.toLowerCase().replaceAll(' ','-'),true,'team',max,enabled,confirm,id]);
    await t.test('admin config accepts maximum-only rules, warns on historical oversize and does not change competitions',async()=>{
      await as(owner);await assert.rejects(configure(game,'VALORANT',8),/admin_required/);
      await as('','anon');await assert.rejects(configure(game,'VALORANT',8),{code:'42501'});
      await as(admin);await assert.rejects(configure(game,'VALORANT',8),/roster_change_confirmation/);
      await configure(game,'VALORANT',8,PARTICIPANT_ROLES,true);
      await configure(ff,'Free Fire',10);
      assert.equal((await db.query('select max_team_size from games where id=$1',[ff])).rows[0].max_team_size,10);
      await configure(ff,'Free Fire',6,['player_1','player_2','player_3','player_4','substitute_1','substitute_2']);
      await configure(soloGame,'Tekken',8);
      assert.equal((await db.query('select registration_type from event_games where id=$1',[solo])).rows[0].registration_type,'solo');
      await assert.rejects(configure(ff,'Free Fire',0),/invalid_roster_config/);
      await assert.rejects(configure(ff,'Free Fire',6,['coach']),/invalid_roster_config/);
      await assert.rejects(configure(ff,'Free Fire',6,['player_1','player_1']),/invalid_roster_config/);
    });
    await t.test('team saves accept 1,3,5,7,8 people with optional coach/substitutes and reject invalid roles atomically',async()=>{
      await as(owner);teamEntry=await rpc('save_registration',[team,people(1),'Small Team','Team Clan',null]);
      for(const n of [3,5,7,8])await rpc('save_registration',[team,people(n),'Flexible Team','Team Clan',teamEntry]);
      assert.equal((await db.query('select count(*) n from registration_players where registration_id=$1',[teamEntry])).rows[0].n,8);
      for(const [roster,error] of [[people(9),/roster_maximum:8/],[people(2).map(p=>({...p,role:'player_1'})),/duplicate_participant_role/],[people(1).map(p=>({...p,role:'coach'})),/invalid_captain_role/],[people(1,false),/invalid_participant_role/]])await assert.rejects(rpc('save_registration',[team,roster,'Rejected',null,teamEntry]),error);
      assert.equal((await db.query('select team_name from registrations where id=$1',[teamEntry])).rows[0].team_name,'Flexible Team');
      assert.equal((await db.query('select count(*) n from registration_players where registration_id=$1',[teamEntry])).rows[0].n,8);
      await assert.rejects(rpc('save_registration',[team,people(1),'Duplicate',null,null]),{code:'23505'});
      await assert.rejects(db.query("insert into registration_players(registration_id,display_name,game_player_id,player_order)values($1,'Bypass','uid',99)",[teamEntry]),{code:'42501'});
    });
    await t.test('insertion failures roll back latest player/admin header and roster replacements',async()=>{
      await as(admin);const saved=(await db.query('select id,ign,participant_role from registration_players where registration_id=$1 order by player_order',[teamEntry])).rows;
      await db.exec(`reset role;create function public.fail_roster_test() returns trigger language plpgsql as $$begin if new.ign='Force rollback' then raise exception 'forced_roster_failure';end if;return new;end$$;
        create trigger fail_roster_test before insert on public.registration_players for each row execute function public.fail_roster_test();`);
      const changed=people(3).map((p,i)=>({...p,ign:i===1?'Force rollback':p.ign}));
      await as(owner);await assert.rejects(rpc('save_registration',[team,changed,'Must roll back','Rejected Clan',teamEntry]),/forced_roster_failure/);
      await as(admin);await assert.rejects(rpc('admin_save_registration',[team,changed,'Must roll back','Rejected Clan',teamEntry,null]),/forced_roster_failure/);
      assert.deepEqual((await db.query('select id,ign,participant_role from registration_players where registration_id=$1 order by player_order',[teamEntry])).rows,saved);
      assert.equal((await db.query('select team_name,clan_name from registrations where id=$1',[teamEntry])).rows[0].team_name,'Flexible Team');
      await db.exec('reset role;drop trigger fail_roster_test on public.registration_players;drop function public.fail_roster_test();');await as(admin);
    });
    await t.test('Free Fire accepts fewer than six, rejects seven and unavailable fifth-player/coach roles',async()=>{
      await as(other);const ffRoles=['player_1','player_2','player_3','player_4','substitute_1','substitute_2'];
      const roster=n=>people(n).map((p,i)=>({...p,role:ffRoles[i]}));
      const entry=await rpc('save_registration',[freeFire,roster(1),'FF',null,null]);
      for(const n of [4,5,6])await rpc('save_registration',[freeFire,roster(n),'FF',null,entry]);
      await assert.rejects(rpc('save_registration',[freeFire,roster(7),'FF',null,entry]),/roster_maximum:6/);
      await assert.rejects(rpc('save_registration',[freeFire,[...roster(1),{...people(2)[1],role:'player_5'}],'FF',null,entry]),/invalid_participant_role/);
      await as(admin);await configure(ff,'Free Fire',1,ffRoles,true);assert.equal((await db.query('select count(*) n from registration_players where registration_id=$1',[entry])).rows[0].n,6);
      await as(other);await assert.rejects(rpc('save_registration',[freeFire,roster(6),'FF',null,entry]),/roster_maximum:1/);
      await rpc('save_registration',[freeFire,roster(1),'FF',null,entry]);
    });
    await t.test('admin creation/edit enforce the same rules after deadlines; cancellation preserves legacy data',async()=>{
      await as(admin);manual=await rpc('admin_save_registration',[team,people(2),'Manual','Manual Clan',null,'55555555-5555-4555-8555-555555555555']);
      const manualSolo=await rpc('admin_save_registration',[solo,people(1,false),null,'Admin Solo Clan',null,'66666666-6666-4666-8666-666666666666']);
      assert.equal((await db.query('select clan_name from registrations where id=$1',[manualSolo])).rows[0].clan_name,'Admin Solo Clan');
      await assert.rejects(rpc('admin_save_registration',[team,people(9),'Too many',null,manual,null]),/roster_maximum:8/);
      await rpc('admin_save_competition',[event,{...values(game,'team'),registration_closes_at:new Date(now-1000).toISOString()},team]);
      await as(owner);await assert.rejects(rpc('save_registration',[team,people(1),'Closed',null,teamEntry]),/registration_closed/);
      await as(admin);await rpc('admin_save_registration',[team,people(3),'Admin updated',null,teamEntry,null]);
      const r=(await db.query('select captain_id,source from registrations where id=$1',[teamEntry])).rows[0];assert.equal(r.captain_id,owner);assert.equal(r.source,'player');
      await rpc('admin_cancel_registration',[legacy]);assert.equal((await db.query('select count(*) n from registration_players where registration_id=$1',[legacy])).rows[0].n,12);
      await as(other);await rpc('cancel_registration',[(await db.query('select id from registrations where event_game_id=$1',[freeFire])).rows[0].id]);
    });
    await t.test('full-event and individual exports retain solo clans, actual roles, captain/email distinction and active-only scope',async()=>{
      await as(admin);const one=await rpc('admin_export_registrations',[event,solo]);assert.equal(one.competitions[0].registrations.find(r=>r.id===soloEntry).clan,'Edited Clan');
      const full=await rpc('admin_export_registrations',[event,null]);assert.equal(full.competitions.flatMap(c=>c.registrations).some(r=>r.id===legacy),false);
      const teamData=full.competitions.find(c=>c.id===team);assert.equal(teamData.maxTeamSize,8);assert.equal(teamData.registrations.find(r=>r.id===teamEntry).players[0].participantRole,'player_1');
      const wb=new ExcelJS.Workbook();await wb.xlsx.load(await createExportWorkbook(full));const sheet=wb.worksheets.find(s=>s.getCell('A4').value==='VALORANT'&&s.getCell('E9').value==='Player 1');
      assert.ok(sheet);assert.equal(sheet.getCell('L9').value,'Yes');assert.equal(sheet.getCell('M9').value,8);assert.equal(sheet.getCell('I9').value,'0771234567');
      const soloWb=new ExcelJS.Workbook();await soloWb.xlsx.load(await createExportWorkbook(one));assert.equal(soloWb.worksheets[0].getCell('D9').value,'Edited Clan');
    });
  }finally{await db.close();}
});
test('shared server validation counts captain, coach and substitutes and accepts maximum-only rosters',()=>{
  for(const count of [1,3,5,7,8])assert.equal(validateTeamRoster(people(count),{maxTeamSize:8}),null);
  assert.match(validateTeamRoster(people(7),{maxTeamSize:6}),/maximum of 6/);
  assert.match(validateTeamRoster(people(2).map(p=>({...p,role:'player_1'}))),/different role/);
});
