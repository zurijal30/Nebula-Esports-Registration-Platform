import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const admin='11111111-1111-4111-8111-111111111111',player='22222222-2222-4222-8222-222222222222';
const correction='202610120004_phase7a_shared_event_banners.sql';
test('latest migration security matrix and shared event banner regression',async(t)=>{
  const db=new PGlite();
  try{
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',created_at timestamptz default now());
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;
      create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner_id text,unique(bucket_id,name));
      alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated,service_role;
      grant select,insert,update,delete on storage.objects to anon,authenticated,service_role;create publication supabase_realtime;`);
    const names=(await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')&&n!==correction).sort();
    for(const name of names)await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
    await db.exec(`insert into auth.users(id,email,raw_user_meta_data)values('${admin}','admin@example.invalid','{}'),('${player}','player@example.invalid','{"role":"admin"}');update profiles set role='admin' where id='${admin}';`);
    const as=async(id,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec(`set role ${role}`);};
    const rpc=async(name,args=[])=>(await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args)).rows[0].result;
    const values=slug=>({title:slug,slug,venue:'Colombo',starts_at:new Date(Date.now()+86400000).toISOString(),ends_at:new Date(Date.now()+172800000).toISOString(),status:'scheduled',is_published:true});
    await as(admin);const original=await rpc('admin_save_event',[values('original'),null]),shared=await rpc('admin_save_event',[values('shared'),null]);
    const reserve=async()=> (await db.query('select * from public.admin_reserve_banner($1)',[original])).rows[0];
    const attach=async asset=>{await db.query("insert into storage.objects(bucket_id,name,owner_id)values('nebula-event-banners',$1,$2)",[asset.path,admin]);await rpc('admin_set_banner',[original,asset.id,'Banner']);};
    const old=await reserve();await attach(old);
    await db.exec('reset role');await db.query('update events set banner_url=$1,banner_alt=$2 where id=$3',[`/event-images/${original}/${old.id}`,'Shared image',shared]);await as(admin);
    const replacement=await reserve();await attach(replacement);
    // Reproduce the old failure before applying the correction, using only disposable data.
    await as('','anon');assert.equal((await db.query('select id from event_banner_assets where id=$1',[old.id])).rows.length,0);
    await db.exec('reset role');await db.exec(await readFile(new URL('../supabase/migrations/'+correction,import.meta.url),'utf8'));
    await t.test('migration repairs shared metadata; replacement/removal preserve access and prevent cleanup',async()=>{
      await as('','anon');assert.equal((await db.query('select id from event_banner_assets where id=$1',[old.id])).rows.length,1);
      assert.equal((await db.query("select name from storage.objects where bucket_id='nebula-event-banners' and name=$1",[old.path])).rows.length,1);
      await as(admin);const newer=await reserve();await attach(newer);await rpc('admin_set_banner',[original,null,null]);
      assert.equal((await db.query('select state from event_banner_assets where id=$1',[old.id])).rows[0].state,'active');
      assert.ok(!(await db.query('select * from public.admin_unused_banners()')).rows.some(a=>a.path===old.path));
      await db.query("delete from storage.objects where bucket_id='nebula-event-banners' and name=$1",[old.path]);
      assert.equal((await db.query('select name from storage.objects where name=$1',[old.path])).rows.length,1);
      await as('','anon');assert.equal((await db.query('select id from event_banner_assets where id=$1',[old.id])).rows.length,1);
      await as(admin);await rpc('admin_set_banner',[shared,null,null]);
      assert.ok((await db.query('select * from public.admin_unused_banners()')).rows.some(a=>a.path===old.path));
      assert.equal((await db.query('select state from event_banner_assets where id=$1',[old.id])).rows[0].state,'retired');
      assert.equal((await db.query('select name from storage.objects where name=$1',[old.path])).rows.length,1);
    });
    await t.test('all application tables retain RLS; privileged functions use empty search paths and restricted execution',async()=>{
      await db.exec('reset role');
      const tables=(await db.query("select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'")).rows;
      assert.ok(tables.length>=9);assert.ok(tables.every(t=>t.relrowsecurity));
      const functions=(await db.query("select n.nspname,p.proname,p.proconfig,has_function_privilege('anon',p.oid,'EXECUTE') anonymous from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.prosecdef")).rows;
      for(const f of functions){assert.ok(f.proconfig.some(v=>v==='search_path=""'),f.proname);if(f.nspname==='public')assert.equal(f.anonymous,false,f.proname);}
      for(const table of ['profiles','registrations','registration_players'])assert.equal((await db.query('select has_table_privilege($1,$2,$3) allowed',['anon','public.'+table,'SELECT'])).rows[0].allowed,false);
    });
    await t.test('metadata cannot elevate roles and ordinary users cannot execute any admin workflow',async()=>{
      await as(player);assert.equal((await db.query('select role from profiles where id=$1',[player])).rows[0].role,'player');
      const attempts=[['admin_save_event',[{},null]],['admin_save_game',['Bad','bad',true,null]],['admin_save_game_details',['Bad','bad',true,'team',null]],['admin_save_game_config',['Bad','bad',true,'team',8,['player_1'],false,null]],['admin_delete_event',[original,'original']],['admin_delete_game',[player,'Bad']],['admin_save_competition',[original,{},null]],['admin_save_registration',[player,[],null,null,null,player]],['admin_cancel_registration',[player]],['admin_change_role',[player,'admin']],['admin_list_users',[]],['admin_overview',[]],['admin_export_registrations',[original,null]],['admin_reserve_banner',[original]],['admin_reserve_game_banner',[player]],['admin_set_banner',[original,null,null]],['admin_set_game_banner',[player,null,null]],['admin_unused_banners',[]],['admin_unused_game_banners',[]],['admin_finish_banner_cleanup',['missing']],['admin_finish_game_banner_cleanup',['missing']]];
      for(const [name,args] of attempts)await assert.rejects(rpc(name,args),/admin_required/,name);
      for(const table of ['events','games','event_games','registrations','registration_players'])await assert.rejects(db.query(`delete from public.${table}`),{code:'42501'});
      await assert.rejects(db.query('update profiles set role=\'admin\' where id=$1',[player]),{code:'42501'});
      await as('','anon');await assert.rejects(rpc('admin_export_registrations',[original,null]),{code:'42501'});
    });
  }finally{await db.close();}
});
