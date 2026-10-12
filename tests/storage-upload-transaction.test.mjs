import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const admin='11111111-1111-4111-8111-111111111111',player='22222222-2222-4222-8222-222222222222';
test('Storage caller probe and internal service-role completion retain banner reservation authorization',async()=>{
  const db=new PGlite();
  try{
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',created_at timestamptz default now());
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;
      create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner uuid,owner_id text,unique(bucket_id,name));
      alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated,service_role;
      grant select,insert,update,delete on storage.objects to anon,authenticated,service_role;
      create publication supabase_realtime;`);
    for(const name of ['202610110001_phase3_foundation.sql','202610110002_phase4_registration.sql','202610110003_phase5_admin.sql','202610110004_admin_event_deletion.sql','202610120001_game_management.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8'));
    await db.exec(`insert into auth.users(id,email)values('${admin}','admin@example.invalid'),('${player}','player@example.invalid');update profiles set role='admin' where id='${admin}';`);
    const as=async(id,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec(`set role ${role}`);};
    await as(admin);
    const game=(await db.query("select admin_save_game_details('Upload Game','upload-game',true,'team',null) id")).rows[0].id;
    const event=(await db.query("select admin_save_event($1,null) id",[{title:'Upload Event',slug:'upload-event',venue:'Colombo',starts_at:new Date(Date.now()+86400000).toISOString(),ends_at:new Date(Date.now()+172800000).toISOString(),status:'scheduled',is_published:true}])).rows[0].id;
    const gameAsset=(await db.query('select * from admin_reserve_game_banner($1)',[game])).rows[0];
    const eventAsset=(await db.query('select * from admin_reserve_banner($1)',[event])).rows[0];
    const insert=async(bucket,asset,owner=admin,column='owner_id')=>db.query(`insert into storage.objects(bucket_id,name,${column})values($1,$2,$3)`,[bucket,asset.path,owner]);
    // The real Storage permission probe is an INSERT rolled back after RLS.
    for(const [bucket,asset] of [['nebula-game-banners',gameAsset],['nebula-event-banners',eventAsset]]){
      await db.exec('begin');await insert(bucket,asset);await db.exec('rollback');
      await as('','service_role');await assert.rejects(insert(bucket,asset),/admin_required/);await as(admin);
    }
    await db.exec('reset role');await db.exec(await readFile(new URL('../supabase/migrations/202610120002_storage_banner_upload_fix.sql',import.meta.url),'utf8'));
    for(const [bucket,asset] of [['nebula-game-banners',gameAsset],['nebula-event-banners',eventAsset]]){
      await as(player);await assert.rejects(insert(bucket,asset),/admin_required/);
      // Claiming a service role in a GUC cannot turn an authenticated SQL role into service_role.
      await db.query("select set_config('request.jwt.claim.role','service_role',false)");await assert.rejects(insert(bucket,asset),/admin_required/);
      await as('','service_role');await assert.rejects(insert(bucket,asset,player),/banner_unavailable/);
      await assert.rejects(insert(bucket,asset,null),/banner_unavailable/);
      await insert(bucket,asset);
    }
    await as(admin);await db.query("select admin_set_game_banner($1,$2,'Game image')",[game,gameAsset.id]);await db.query("select admin_set_banner($1,$2,'Event image')",[event,eventAsset.id]);
    const stale=(await db.query('select * from admin_reserve_game_banner($1)',[game])).rows[0];
    await db.exec('reset role');await db.query("update game_banner_assets set state='retired' where id=$1",[stale.id]);
    await as('','service_role');await assert.rejects(insert('nebula-game-banners',stale),/banner_unavailable/);
    await as(admin);const legacy=(await db.query('select * from admin_reserve_game_banner($1)',[game])).rows[0];
    await as('','service_role');await insert('nebula-game-banners',legacy,admin,'owner');
    // A demoted reservation creator cannot finish uploading through the internal role.
    await as(admin);const demoted=(await db.query('select * from admin_reserve_game_banner($1)',[game])).rows[0];
    await db.exec('reset role');await db.query("update profiles set role='admin' where id=$1",[player]);await db.query("update profiles set role='player' where id=$1",[admin]);
    await as('','service_role');await assert.rejects(insert('nebula-game-banners',demoted),/admin_required/);
  }finally{await db.close();}
});
