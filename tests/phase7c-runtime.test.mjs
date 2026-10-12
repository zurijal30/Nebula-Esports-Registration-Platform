import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import nextConfig from '../next.config.ts';
import { MAX_BANNER_BYTES } from '../src/lib/game-image.ts';

test('maximum accepted banner plus real multipart fields stays below both hosting and Server Action limits', async()=>{
  const form=new FormData();
  form.set('banner',new File([new Uint8Array(MAX_BANNER_BYTES)],'banner.png',{type:'image/png'}));
  form.set('alt','A'.repeat(240));form.set('event_id','11111111-1111-4111-8111-111111111111');
  const bytes=(await new Request('https://local.example',{method:'POST',body:form}).arrayBuffer()).byteLength;
  assert.ok(bytes<nextConfig.experimental.serverActions.bodySizeLimit);
  assert.ok(nextConfig.experimental.serverActions.bodySizeLimit<4_500_000);
});

test('actual authorized export handler rejects oversized workbook bytes with a private recoverable response',async()=>{
  const url=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
  const workbook=url('export let size=1;export const setSize=value=>size=value;export const createExportWorkbook=async()=>new Uint8Array(size);export const exportFilename=()=>"registrations.xlsx";');
  let source=await readFile(new URL('../src/lib/admin/export-response.ts',import.meta.url),'utf8');
  for(const [from,to] of Object.entries({'../auth/policy.ts':new URL('../src/lib/auth/policy.ts',import.meta.url).href,'../registrations/policy.ts':new URL('../src/lib/registrations/policy.ts',import.meta.url).href,'./export-workbook.ts':workbook}))source=source.replaceAll('"'+from+'"',JSON.stringify(to));
  const {exportResponse,MAX_EXPORT_BYTES}=await import(url(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText));
  const {setSize}=await import(workbook);
  const id='11111111-1111-4111-8111-111111111111';
  const deps={account:async()=>({user:{id},profile:{id,role:'admin'}}),snapshot:async()=>({error:null,data:{eventId:id,eventTitle:'Event',competitions:[]}})};
  setSize(MAX_EXPORT_BYTES+1);
  const rejected=await exportResponse(new Request('https://local.example/export'),id,deps);
  assert.equal(rejected.status,413);assert.match(rejected.headers.get('cache-control'),/private.*no-store/);assert.equal(rejected.headers.get('content-disposition'),null);assert.match((await rejected.json()).error,/smaller competition/);
  setSize(1);
  const accepted=await exportResponse(new Request('https://local.example/export'),id,deps);
  assert.equal(accepted.status,200);assert.equal((await accepted.arrayBuffer()).byteLength,1);
});
