import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const moduleUrl=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const stub=moduleUrl(`export const state={client:null,origin:'https://nebula.example',changes:[]};
  export const createServerSupabaseClient=async()=>state.client;
  export const getSiteOrigin=()=>state.origin;
  export const revalidatePath=(...v)=>state.changes.push(v);
  export const redirect=to=>{throw Object.assign(new Error('Redirect'),{destination:to});};
  export class NextResponse extends Response{static redirect(url,options){return new Response(null,{status:307,headers:{...Object.fromEntries(options.headers),Location:String(url)}});}}`);
const {state}=await import(stub);
async function actual(path){
  let source=await readFile(new URL(path,import.meta.url),'utf8');
  for(const name of ['next/navigation','next/cache','next/server','@/lib/supabase/server','@/lib/auth/site-origin','./site-origin'])source=source.replaceAll('"'+name+'"',JSON.stringify(stub));
  for(const name of ['@/lib/auth/policy','./policy'])source=source.replaceAll('"'+name+'"',JSON.stringify(new URL('../src/lib/auth/policy.ts',import.meta.url).href));
  return import(moduleUrl(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText));
}
const form=values=>{const f=new FormData();for(const [k,v] of Object.entries(values))f.set(k,v);return f;};
test('actual email actions sanitize destinations, omit privileged metadata and protect profile/password writes',async()=>{
  const actions=await actual('../src/lib/auth/actions.ts');let signup,updated,queryOwner,passwordWrites=0;
  const profileQuery={eq(k,v){queryOwner=[k,v];return this;},select(){return this;},async maybeSingle(){return {data:{id:'verified-owner'},error:null};}};
  state.client={auth:{signInWithPassword:async()=>({error:null}),signUp:async v=>{signup=v;return {data:{session:null},error:null};},getUser:async()=>({data:{user:{id:'verified-owner'}},error:null}),updateUser:async()=>{passwordWrites++;return {error:null};}},from:()=>({update:v=>{updated=v;return profileQuery;}})};
  await assert.rejects(actions.signInAction({},form({email:'player@example.invalid',password:'test-password',next:'//evil.invalid'})),e=>e.destination==='/dashboard');
  const result=await actions.signUpAction({},form({email:'player@example.invalid',display_name:'Player',password:'test-password',confirm_password:'test-password',role:'admin',next:'https://evil.invalid'}));
  assert.ok(result.success);assert.deepEqual(signup.options.data,{display_name:'Player'});assert.equal(signup.options.emailRedirectTo,'https://nebula.example/auth/callback?next=%2Fdashboard');
  await actions.updateProfileAction({},form({id:'victim',role:'admin',display_name:'Updated',contact_phone:'0771234567'}));
  assert.deepEqual(queryOwner,['id','verified-owner']);assert.deepEqual(updated,{display_name:'Updated',contact_phone:'0771234567'});
  state.client.auth.getUser=async()=>({data:{user:null},error:{code:'expired'}});
  assert.match((await actions.updatePasswordAction({},form({password:'new-password',confirm_password:'new-password'}))).error,/expired/);assert.equal(passwordWrites,0);
});
test('actual logout is local, failed auth messages do not expose provider details, reset links use canonical origin',async()=>{
  const actions=await actual('../src/lib/auth/actions.ts');let scope,reset;
  state.client={auth:{signOut:async v=>{scope=v;return {error:null};},signInWithPassword:async()=>({error:{code:'unknown',message:'PRIVATE_TOKEN'}}),resetPasswordForEmail:async(e,v)=>{reset=v;return {error:null};}}};
  await assert.rejects(actions.signOutAction(),e=>e.destination==='/sign-in?notice=signed-out');assert.deepEqual(scope,{scope:'local'});
  assert.ok(!(await actions.signInAction({},form({email:'player@example.invalid',password:'test-password'}))).error.includes('PRIVATE_TOKEN'));
  await actions.requestPasswordResetAction({},form({email:'player@example.invalid',redirect_to:'https://evil.invalid'}));assert.equal(reset.redirectTo,'https://nebula.example/auth/callback?next=/update-password');
});
test('actual OAuth callback rejects external returns and strips credentials with private/no-referrer headers',async()=>{
  const callback=await actual('../src/app/auth/callback/route.ts');let called;
  state.client={auth:{exchangeCodeForSession:async code=>{called=code;return {error:null};}}};
  let response=await callback.GET({nextUrl:new URL('https://untrusted-host.invalid/auth/callback?code=test-code&next=https://evil.invalid')});
  assert.equal(called,'test-code');assert.equal(response.headers.get('location'),'https://nebula.example/dashboard');assert.match(response.headers.get('cache-control'),/private.*no-store/);assert.equal(response.headers.get('referrer-policy'),'no-referrer');
  state.client.auth.exchangeCodeForSession=async()=>{throw new Error('PRIVATE_TOKEN');};response=await callback.GET({nextUrl:new URL('https://nebula.example/auth/callback?code=secret&next=/admin')});
  assert.equal(response.headers.get('location'),'https://nebula.example/sign-in?error=callback');assert.ok(!(await response.text()).includes('PRIVATE_TOKEN'));
});
test('actual email confirmation restricts OTP types and forces recovery to the password page',async()=>{
  const confirm=await actual('../src/app/auth/confirm/route.ts');let calls=0;
  state.client={auth:{verifyOtp:async()=>{calls++;return {error:null};}}};
  const request=query=>({nextUrl:new URL('https://nebula.example/auth/confirm?'+query)});
  let response=await confirm.GET(request('token_hash=token&type=admin&next=/admin'));assert.equal(calls,0);assert.equal(response.headers.get('location'),'https://nebula.example/sign-in?error=confirmation');
  response=await confirm.GET(request('token_hash=token&type=recovery&next=/admin'));assert.equal(response.headers.get('location'),'https://nebula.example/update-password');
  response=await confirm.GET(request('token_hash=token&type=signup&redirect_to=https://evil.invalid/auth/callback?next=/admin'));assert.equal(response.headers.get('location'),'https://nebula.example/dashboard');
});
