import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {allRows} from '../src/lib/supabase/pagination.ts';
const moduleUrl=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
test('complete lists pass 1,000 rows and never return partial data after a failed page',async()=>{
  const data=Array.from({length:1507},(_,id)=>({id})),ranges=[];
  const result=await allRows({range:async(a,b)=>{ranges.push([a,b]);return {data:data.slice(a,b+1),error:null};}});
  assert.deepEqual(result.data,data);assert.equal(result.error,false);assert.deepEqual(ranges,[[0,499],[500,999],[1000,1499],[1500,1999]]);
  const failure=await allRows({range:async(a,b)=>a===500?{data:null,error:{code:'timeout'}}:{data:data.slice(a,b+1),error:null}});
  assert.deepEqual(failure,{data:[],error:true});assert.deepEqual(await allRows({range:async()=>({data:null,error:null})}),{data:[],error:true});
});
test('actual public event and owner-registration data loaders paginate with stable ordering and filters',async()=>{
  for(const [path,method,expectedFilter] of [['../src/lib/tournaments/live.ts','getLiveEvents',['is_published',true]],['../src/lib/registrations/data.ts','getMyRegistrations',['captain_id','owner-id']]]){
    const filters=[],orders=[],ranges=[];
    const rows=Array.from({length:1003},(_,i)=>method==='getLiveEvents'?{id:String(i),slug:'event-'+i,title:'Event '+i,event_games:[]}:{id:String(i),captain_id:'owner-id'});
    const query={select(){return this;},eq(k,v){filters.push([k,v]);return this;},order(k){orders.push(k);return this;},async range(a,b){ranges.push([a,b]);return {data:rows.slice(a,b+1),error:null};}};
    const client={from(){return query;}};
    const stub=moduleUrl(`export const client={};export const createServerSupabaseClient=async()=>client;`),stubModule=await import(stub);stubModule.client.from=client.from;
    let source=(await readFile(new URL(path,import.meta.url),'utf8')).replace('import "server-only";','');
    source=source.replace('"@/lib/supabase/server"',JSON.stringify(stub)).replace('"@/lib/supabase/pagination"',JSON.stringify(new URL('../src/lib/supabase/pagination.ts',import.meta.url).href)).replace('"./live-model"',JSON.stringify(new URL('../src/lib/tournaments/live-model.ts',import.meta.url).href));
    const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
    const loaded=await import(moduleUrl(output));const result=await loaded[method](method==='getMyRegistrations'?'owner-id':undefined);
    assert.equal((result.tournaments??result.registrations).length,1003);assert.equal(result.error,false);assert.ok(filters.some(f=>f[0]===expectedFilter[0]&&f[1]===expectedFilter[1]));assert.ok(orders.includes('id'));assert.equal(ranges.length,3);
  }
});
test('ExcelJS resolves patched UUID and its CommonJS conditional-format writer still works',()=>{
  const require=createRequire(import.meta.resolve('exceljs'));
  assert.equal(require('uuid/package.json').version,'11.1.1');
  const Transform=require('./lib/xlsx/xform/sheet/cf-ext/cf-rule-ext-xform.js');
  const model={type:'iconSet',iconSet:'3Stars'};new Transform().prepare(model);assert.match(model.x14Id,/^\{[0-9A-F-]{36}\}$/);
});
