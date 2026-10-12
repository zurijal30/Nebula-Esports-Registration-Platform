import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
const url=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const stub=url(`export const state={path:'/',effects:[],deps:[],refreshes:0,version:1,queries:0,removed:0,animations:[],cancelled:0};
export const router={refresh:()=>state.refreshes++};
export const useRouter=()=>router;export const usePathname=()=>state.path;
export const useEffect=(fn,deps)=>{state.effects.push(fn);state.deps=deps;};
export const useRef=()=>({current:{animate:(frames,options)=>{state.animations.push({frames,options});return {cancel:()=>state.cancelled++};}}});
export const getSupabaseConfig=()=>({});
export const createBrowserSupabaseClient=()=>({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>{state.queries++;if(state.fail)throw Error('offline');return {data:{version:state.version}};}})})}),channel:()=>({on(_type,_filter,fn){state.event=fn;return this;},subscribe(fn){state.subscribe=fn;fn('SUBSCRIBED');return this;}}),removeChannel:async()=>{state.removed++;}});
export const createServerClient=()=>({});export const NextResponse={};`);
const {state}=await import(stub);
async function actual(path,names){
  let source=await readFile(new URL(path,import.meta.url),'utf8');
  for(const name of names)source=source.replaceAll('"'+name+'"',JSON.stringify(stub));
  const output=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from (["'])react\/jsx-runtime\1/g,(_,q)=>`from ${q}${import.meta.resolve('react/jsx-runtime')}${q}`);
  return import(url(output));
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function environment(run){
  const previous={window:globalThis.window,document:globalThis.document};const listeners=new Map(),motionListeners=new Map();
  const motion={matches:false,addEventListener:(_key,fn)=>motionListeners.set('change',fn),removeEventListener:()=>motionListeners.delete('change')};
  globalThis.window={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),matchMedia:()=>motion};
  globalThis.document={visibilityState:'visible'};
  try{await run({listeners,motion,motionListeners});}finally{globalThis.window=previous.window;globalThis.document=previous.document;}
}

test('actual live refresh reconciles once, avoids unchanged focus/reconnect refreshes and retains updates',async()=>environment(async({listeners})=>{
  Object.assign(state,{path:'/',effects:[],refreshes:0,version:1,queries:0,removed:0,fail:false});
  const {LiveEventRefresh}=await actual('../src/components/tournaments/live-refresh.tsx',['react','next/navigation','@/lib/supabase/client','@/lib/auth/config']);
  LiveEventRefresh();const deps=state.deps;const cleanup=state.effects[0]();
  try{
    await settle();assert.equal(state.refreshes,1,'initial reconciliation prevents missed pre-subscription edits');
    listeners.get('focus')();state.subscribe('SUBSCRIBED');await settle();assert.equal(state.refreshes,1);
    state.version=2;listeners.get('focus')();await settle();assert.equal(state.refreshes,2);
    state.version=3;state.event();await settle();assert.equal(state.refreshes,3);
    state.path='/tournaments/live/published';LiveEventRefresh();assert.deepEqual(state.deps,deps,'public navigation keeps the subscription effect dependencies stable');
    state.fail=true;state.event();await settle();assert.equal(state.refreshes,4,'realtime still refreshes if the version probe fails');
    cleanup();listeners.get('focus')?.();await settle();assert.equal(state.removed,1);assert.equal(listeners.size,0);
  }finally{cleanup();}
}));

test('actual page transition preserves content, uses 180ms transform/opacity and honors reduced motion',async()=>environment(async({motion,motionListeners})=>{
  Object.assign(state,{effects:[],animations:[],cancelled:0,path:'/about'});
  const {PageTransition}=await actual('../src/components/layout/page-transition.tsx',['react','next/navigation']);
  const rendered=PageTransition({children:'Route content'});assert.equal(rendered.props.children,'Route content');assert.equal(rendered.key,null);
  const cleanup=state.effects[0]();assert.equal(state.animations[0].options.duration,180);
  assert.equal(state.animations[0].frames[0].transform,'translateY(3px)');
  motion.matches=true;motionListeners.get('change')();assert.equal(state.cancelled,1);cleanup();assert.equal(motionListeners.size,0);
  state.effects=[];PageTransition({children:'Still readable'});state.effects[0]();assert.equal(state.animations.length,1);
}));

test('browser icons are valid standard sizes derived from the existing shield',async()=>{
  for(const [name,size] of [['icon1.png',32],['icon2.png',192],['apple-icon.png',180]]){
    const bytes=await readFile(new URL('../src/app/'+name,import.meta.url));const metadata=await sharp(bytes).metadata();
    assert.equal(metadata.width,size);assert.equal(metadata.height,size);await sharp(bytes).raw().toBuffer();
  }
  const expected=await sharp(fileURLToPath(new URL('../assets/nebula-logo.png',import.meta.url))).extract({left:120,top:106,width:260,height:289}).resize(32,32,{fit:'contain',background:'#00000000'}).png().toBuffer();
  assert.deepEqual(await readFile(new URL('../src/app/icon1.png',import.meta.url)),expected);
  const ico=await readFile(new URL('../src/app/favicon.ico',import.meta.url));assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);
  for(let index=0;index<3;index++){
    const entry=6+index*16,size=[16,32,48][index],offset=ico.readUInt32LE(entry+12),length=ico.readUInt32LE(entry+8);
    assert.equal(ico[entry],size);const metadata=await sharp(ico.subarray(offset,offset+length)).metadata();assert.equal(metadata.width,size);assert.equal(metadata.height,size);
  }
});

test('proxy skips only public static artwork/icons while protected routes still match',async()=>{
  const {config}=await actual('../src/proxy.ts',['@supabase/ssr','next/server','@/lib/auth/config']);
  const matcher=new RegExp('^'+config.matcher[0]+'$');
  for(const path of ['/favicon.ico','/icon1.png','/icon2.png','/apple-icon.png','/assets/games/free-fire-logo.webp','/images/nebula-logo.png'])assert.equal(matcher.test(path),false,path);
  for(const path of ['/dashboard','/admin','/admin/exports/events/id','/event-images/event/asset','/game-images/game/asset','/auth/callback','/tournaments','/icon1.png-other'])assert.equal(matcher.test(path),true,path);
});
