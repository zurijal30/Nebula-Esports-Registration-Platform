import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
// Render the actual client components with inert action and Link adapters.
// This cannot contact Supabase or invoke a deletion.
const stub='data:text/javascript;base64,'+Buffer.from(`import React from '${import.meta.resolve('react')}';export const deleteEventAction=async()=>({});export const changeRoleAction=async()=>({});export default function Link(p){return React.createElement('a',p,p.children);}`).toString('base64');
async function component(path,replacements={}) {
  let source=await readFile(new URL(path,import.meta.url),'utf8');
  for(const [from,to] of Object.entries(replacements))source=source.replaceAll('"'+from+'"','"'+to+'"');
  const output=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  // Resolve package imports from this project rather than the data URL.
  const resolved=output.replace(/from (["'])(react(?:\/jsx-runtime)?|lucide-react)\1/g,(_,quote,name)=>`from ${quote}${import.meta.resolve(name)}${quote}`);
  return 'data:text/javascript;base64,'+Buffer.from(resolved).toString('base64');
}
test('every rendered event card has its own edit/delete action and confirmation counts',async()=>{
  const deletion=await component('../src/components/admin/delete-event.tsx',{'@/lib/admin/actions':stub,'@/lib/admin/event-deletion':new URL('../src/lib/admin/event-deletion.ts',import.meta.url).href});
  const confirmation='data:text/javascript,export function ConfirmationForm(){return null;}';
  const exportButton=await component('../src/components/admin/export-button.tsx');
  const format='data:text/javascript;base64,'+Buffer.from('export const formatDateTime=v=>v;').toString('base64');
  const catalogue=await component('../src/components/admin/catalogue.tsx',{'next/link':stub,'@/lib/admin/actions':stub,'@/lib/tournament-format':format,'./confirmation-form':confirmation,'./delete-event':deletion,'./export-button':exportButton});
  const {AdminCatalogue}=await import(catalogue);
  const events=[{id:'event-a',title:'Arena A',venue:'Colombo',starts_at:'2026-11-01',event_games:[{id:'comp-a'}]},{id:'event-b',title:'Arena B',venue:'Colombo',starts_at:'2026-11-02',event_games:[]}];
  const html=renderToStaticMarkup(React.createElement(AdminCatalogue,{kind:'events',events,registrations:[{event_game_id:'comp-a',status:'cancelled',registration_players:[]},{event_game_id:'comp-a',status:'active',registration_players:[]}],now:0}));
  assert.equal((html.match(/>Delete Event<\/button>/g)??[]).length,2);
  assert.equal((html.match(/>Export Entire Event<\/button>/g)??[]).length,2);
  for(const event of events){assert.ok(html.includes(`href="/admin/events/${event.id}"`));assert.ok(html.includes(`name="id" value="${event.id}"`));assert.ok(html.includes(`aria-label="Delete ${event.title}?"`));}
  assert.ok(html.includes('1 game competitions · 2 registrations, including cancelled entries.'));
  assert.ok(html.includes('0 game competitions · 0 registrations, including cancelled entries.'));
  assert.equal((html.match(/disabled="">Permanently Delete Event/g)??[]).length,2);
  assert.equal((html.match(/<dialog /g)??[]).length,2);assert.equal((html.match(/<dialog[^>]* open/g)??[]).length,0);
});
test('the actual public event page uses Not Found when a deleted slug has no event',async()=>{
  const missing='data:text/javascript;base64,'+Buffer.from(`export async function getLiveEvents(){return {tournaments:[],error:false};}export function notFound(){throw Object.assign(Error('Not Found'),{status:404});}export const getCurrentAccount=()=>{throw Error('must not fetch account for missing event');};export const getMyRegistrations=()=>{};export const getRequestNow=()=>{};export const formatDateTime=()=>{};export const TournamentArtwork=()=>{};export const CompetitionList=()=>{};export const TournamentRegistrationStatus=()=>{};export default function Link(){return null;}`).toString('base64');
  const replacements=Object.fromEntries(['next/navigation','next/link','@/lib/tournaments/live','@/lib/auth/account','@/lib/registrations/data','@/lib/server-time','@/lib/tournament-format','@/components/tournaments/tournament-artwork','@/components/tournaments/competition-list'].map(name=>[name,missing]));
  const {default:Page}=await import(await component('../src/app/tournaments/live/[slug]/page.tsx',replacements));
  await assert.rejects(Page({params:Promise.resolve({slug:'deleted-disposable-event'})}),{status:404});
});
