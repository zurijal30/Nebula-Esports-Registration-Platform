import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const moduleUrl=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const stub=moduleUrl(`export const state={client:null,admin:false,clients:0};export const createServerSupabaseClient=async()=>{state.clients++;return state.client;};export const requireAdmin=async()=>{if(!state.admin)throw new Error('ACCESS_DENIED');};export const revalidatePath=()=>{};export const redirect=destination=>{throw Object.assign(new Error('Redirect'),{destination});};export const MAX_BANNER_BYTES=4*1024*1024;export const prepareBanner=async()=>new Uint8Array();`);
const {state}=await import(stub);
async function load(path){
  let source=await readFile(new URL(path,import.meta.url),'utf8');
  const replacements={'next/navigation':stub,'next/cache':stub,'@/lib/auth/account':stub,'@/lib/supabase/server':stub,'./banner':stub,'./policy':new URL(path.includes('/admin/')?'../src/lib/admin/policy.ts':'../src/lib/registrations/policy.ts',import.meta.url).href,'./game-policy':new URL('../src/lib/admin/game-policy.ts',import.meta.url).href,'./game-banner-error':new URL('../src/lib/admin/game-banner-error.ts',import.meta.url).href,'./event-deletion':new URL('../src/lib/admin/event-deletion.ts',import.meta.url).href,'@/lib/registrations/policy':new URL('../src/lib/registrations/policy.ts',import.meta.url).href,'@/lib/registrations/roster-rules':new URL('../src/lib/registrations/roster-rules.ts',import.meta.url).href};
  for(const [name,target] of Object.entries(replacements))source=source.replaceAll('"'+name+'"',JSON.stringify(target));
  return import(moduleUrl(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText));
}
test('every actual administrator server action rejects an unprivileged caller before touching a client',async()=>{
  state.admin=false;state.clients=0;
  const actions=await load('../src/lib/admin/actions.ts');
  for(const action of Object.values(actions))await assert.rejects(action({},new FormData()),/ACCESS_DENIED/);
  assert.equal(state.clients,0);assert.ok(Object.keys(actions).length>0);
});
test('actual player action uses database format/cap/roles and rejects manipulated rosters before RPC',async()=>{
  const actions=await load('../src/lib/registrations/actions.ts');let rpcCalls=0;
  const records={event_games:{registration_type:'team',game_id:'game'},games:{max_team_size:6,available_roles:['player_1','player_2','player_3','player_4','substitute_1','substitute_2']}};
  state.client={auth:{getUser:async()=>({data:{user:{id:'owner'}},error:null})},from:table=>({select(){return this;},eq(){return this;},async maybeSingle(){return {data:records[table],error:null};}}),rpc:async()=>{rpcCalls++;return {error:null};}};
  const form=new FormData();form.set('competitionId','11111111-1111-4111-8111-111111111111');form.set('teamName','Team');form.set('type','solo');form.set('max_team_size','100');
  const person=(role)=>({key:role,fullName:'Player',ign:'IGN',gameId:'0001',phone:'0771234567',role});
  form.set('players',JSON.stringify([...records.games.available_roles.map(person),person('coach')]));
  assert.match((await actions.saveRegistrationAction({},form)).error,/maximum of 6/);
  form.set('players',JSON.stringify([person('player_1'),person('player_5')]));assert.match((await actions.saveRegistrationAction({},form)).error,/available role/);assert.equal(rpcCalls,0);
  form.set('players',JSON.stringify([person('player_1')]));await assert.rejects(actions.saveRegistrationAction({},form),e=>e.destination==='/dashboard/registrations?notice=created');assert.equal(rpcCalls,1);
  state.client.auth.getUser=async()=>({data:{user:null},error:{code:'expired'}});assert.match((await actions.saveRegistrationAction({},form)).error,/sign in again/);assert.equal(rpcCalls,1);
});
