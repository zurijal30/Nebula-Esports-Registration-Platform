import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {moveTeammate,removeTeammate} from '../src/lib/registrations/policy.ts';
const moduleUrl=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const stub=moduleUrl(`import React from '${import.meta.resolve('react')}';export const saveRegistrationAction=async()=>({});export const saveGameAction=async()=>({});export function SubmitButton({label}){return React.createElement('button',null,label);}export default function Image({src,alt}){return React.createElement('img',{src,alt});}`);
async function component(path){
  let source=await readFile(new URL(path,import.meta.url),'utf8');
  const replacements={'@/lib/registrations/actions':stub,'@/lib/admin/actions':stub,'@/components/auth/submit-button':stub,'next/image':stub,'@/lib/registrations/policy':new URL('../src/lib/registrations/policy.ts',import.meta.url).href,'@/lib/registrations/roster-rules':new URL('../src/lib/registrations/roster-rules.ts',import.meta.url).href,'@/lib/game-image':new URL('../src/lib/game-image.ts',import.meta.url).href};
  for(const [from,to] of Object.entries(replacements))source=source.replaceAll('"'+from+'"','"'+to+'"');
  const output=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  return import(moduleUrl(output.replace(/from (["'])(react(?:\/jsx-runtime)?|lucide-react)\1/g,(_,quote,name)=>`from ${quote}${import.meta.resolve(name)}${quote}`)));
}
const players=Array.from({length:3},(_,i)=>({key:`p${i}`,fullName:`Name ${i}`,ign:`IGN ${i}`,gameId:`000${i}`,phone:'0771234567',role:`player_${i+1}`}));
test('participant reordering/removal keeps roles and contact values together and protects the captain',()=>{
  const reordered=moveTeammate(players,1,1);
  assert.equal(reordered[0],players[0]);assert.equal(reordered[2],players[1]);assert.equal(reordered[1],players[2]);assert.equal(players[1].key,'p1');
  assert.equal(moveTeammate(players,1,-1),players);assert.equal(moveTeammate(players,0,1),players);
  assert.deepEqual(removeTeammate(reordered,'p1'),[players[0],players[2]]);assert.deepEqual(removeTeammate(players,'p0'),players);
});
test('actual registration forms show solo clans, unique role options, maximum counters and intact legacy rosters',async()=>{
  const {RegistrationForm}=await component('../src/components/registrations/registration-form.tsx');
  const props={competitionId:'competition',email:'owner@example.invalid',initialPlayers:players,initialTeam:'Team',initialClan:'Clan'};
  const team=renderToStaticMarkup(React.createElement(RegistrationForm,{...props,type:'team',rosterRules:{maxTeamSize:3}}));
  assert.ok(team.includes('Registered: 3 / 3'));assert.ok(team.includes('Remaining: 0'));assert.match(team,/disabled=""[^>]*>.*Add Participant/);
  assert.equal((team.match(/<select required=""/g)||[]).length,3);assert.match(team,/<option value="player_2" disabled=""/);
  const captain=team.slice(team.indexOf('Participant Role'),team.indexOf('</select>'));
  assert.ok(!captain.includes('value="coach"'));assert.ok(!captain.includes('value="substitute_1"'));
  const solo=renderToStaticMarkup(React.createElement(RegistrationForm,{...props,type:'solo',initialPlayers:[{...players[0],role:null}]}));
  assert.ok(solo.includes('name="clanName"'));assert.ok(solo.includes('value="Clan"'));assert.ok(!solo.includes('Participant Role'));assert.ok(!solo.includes('Team identity'));
  const legacy=renderToStaticMarkup(React.createElement(RegistrationForm,{...props,type:'team',registrationId:'legacy',initialPlayers:players.map(p=>({...p,role:null})),rosterRules:{maxTeamSize:1}}));
  assert.ok(legacy.includes('Registered: 3 / 1'));assert.ok(legacy.includes('existing roster is preserved'));assert.equal((legacy.match(/Unassigned · choose a role/g)||[]).length,3);
});
test('actual admin game editor renders configurable roles and confirms preservation of oversized rosters',async()=>{
  const {GameEditor}=await component('../src/components/admin/game-editor.tsx');
  const html=renderToStaticMarkup(React.createElement(GameEditor,{game:{id:'ff',title:'Free Fire',reference_type:'team',max_team_size:6,available_roles:['player_1','player_2','player_3','player_4','substitute_1','substitute_2']},existingRosters:[{size:7,roles:[null]}]}));
  assert.ok(html.includes('Maximum Individuals Per Team'));assert.ok(html.includes('name="max_team_size"'));assert.ok(html.includes('value="6"'));assert.ok(html.includes('1 existing rosters'));assert.ok(html.includes('name="confirm_roster"'));assert.ok(html.includes('6 individual role slots'));
  assert.match(html,/<input type="checkbox" name="available_roles" value="player_5"\/>/);
});
