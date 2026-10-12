import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import sharp from 'sharp';
import {prepareBanner,MAX_BANNER_BYTES} from '../src/lib/admin/banner.ts';
import {canDeleteGame,exactGameConfirmation,validateGameReference} from '../src/lib/admin/game-policy.ts';
import {mapLiveEvent} from '../src/lib/tournaments/live-model.ts';
import {gameImage,GAME_BANNER_FALLBACK} from '../src/lib/game-image.ts';
import {gameBannerError} from '../src/lib/admin/game-banner-error.ts';
const dataModule=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const stub=dataModule(`import React from '${import.meta.resolve('react')}';
export const saveGameAction=async()=>({});export const deleteGameAction=async()=>({});
export const useTournamentClock=n=>n;
export function ActionLink({href,children}){return React.createElement('a',{href},children);}
export function SubmitButton({label}){return React.createElement('button',null,label);}
export default function Image({src,alt}){return React.createElement('img',{src,alt});}`);
async function component(path,replacements={}){
  let source=await readFile(new URL(path,import.meta.url),'utf8');
  for(const [from,to] of Object.entries(replacements))source=source.replaceAll('"'+from+'"','"'+to+'"');
  const output=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  return dataModule(output.replace(/from (["'])(react(?:\/jsx-runtime)?|lucide-react)\1/g,(_,quote,name)=>`from ${quote}${import.meta.resolve(name)}${quote}`));
}
const local=path=>new URL(path,import.meta.url).href;
test('banner failures identify the actual stage and safe code without exposing provider details',()=>{
  assert.match(gameBannerError('reservation',{code:'PGRST202'}),/reservation failed \(PGRST202\).*migration/);
  assert.match(gameBannerError('upload',{statusCode:'403'}),/upload failed \(403\).*rejected access/);
  assert.match(gameBannerError('attachment',{code:'42501'}),/attachment failed \(42501\)/);
  assert.match(gameBannerError('removal',{code:'404'}),/nebula-game-banners bucket/);
  assert.ok(!gameBannerError('upload',{message:'private-token-example',code:'https://private.invalid/secret'}).includes('private'));
});
test('game confirmation is exact, referenced games are blocked and reference type is informational',()=>{
  assert.equal(canDeleteGame('Game','Game',0),true);
  for(const value of ['game','Game ',' Game',''])assert.equal(exactGameConfirmation('Game',value),false);
  assert.equal(canDeleteGame('Game','Game',1),false);
  assert.equal(exactGameConfirmation('',''),false);
  for(const value of ['','solo','team'])assert.equal(validateGameReference(value),true);
  assert.equal(validateGameReference('5v5'),false);
});
test('game banners validate actual JPG/PNG/WebP content, size and corrupt payloads',async()=>{
  for(const [format,mime] of [['jpeg','image/jpeg'],['png','image/png'],['webp','image/webp']]){
    const input=await sharp({create:{width:32,height:18,channels:3,background:'#102d4b'}})[format]().toBuffer();
    const output=await prepareBanner(input,mime);assert.equal((await sharp(output).metadata()).format,'webp');
    await assert.rejects(prepareBanner(input,'image/gif'));
    await assert.rejects(prepareBanner(input,format==='png'?'image/webp':'image/png'));
  }
  await assert.rejects(prepareBanner(new Uint8Array(MAX_BANNER_BYTES+1),'image/png'));
  await assert.rejects(prepareBanner(new Uint8Array([1,2,3]),'image/png'));
});
test('live mapping uses global game banners and competition format independently of catalogue classification',()=>{
  const row={slug:'arena',title:'Arena',banner_url:'/event-images/event/asset',banner_alt:'Event',event_games:[{id:'c1',registration_type:'solo',games:{title:'Game',is_active:true,reference_type:'team',banner_url:'/game-images/game/asset',banner_alt:'Game image'}},{id:'c2',registration_type:'team',games:{title:'No image',is_active:true}},{id:'hidden',games:{is_active:false}}]};
  const tournament=mapLiveEvent(row);assert.equal(tournament.displayImage.src,row.banner_url);
  assert.equal(tournament.competitions[0].gameImage.src,'/game-images/game/asset');
  assert.equal(tournament.competitions[0].registrationType,'solo');
  assert.equal(tournament.competitions[1].gameImage,null);assert.equal(tournament.competitions.length,2);
  assert.equal(gameImage(null).src,GAME_BANNER_FALLBACK);
  assert.equal(gameImage({src:'',alt:''}).src,GAME_BANNER_FALLBACK);
});
test('actual game forms and dialogs render current images, reference options, correct IDs and blocked deletion',async()=>{
  const {GameEditor}=await import(await component('../src/components/admin/game-editor.tsx',{'next/image':stub,'@/lib/admin/actions':stub,'@/components/auth/submit-button':stub,'@/lib/game-image':local('../src/lib/game-image.ts'),'@/lib/registrations/roster-rules':local('../src/lib/registrations/roster-rules.ts')}));
  const {DeleteGame}=await import(await component('../src/components/admin/delete-game.tsx',{'@/lib/admin/actions':stub,'@/lib/admin/game-policy':local('../src/lib/admin/game-policy.ts')}));
  const html=renderToStaticMarkup(React.createElement(GameEditor,{game:{id:'game-a',title:'Game A',is_active:true,reference_type:'team',banner_url:'/game-images/a/b'}}));
  assert.ok(html.includes('name="id" value="game-a"'));assert.ok(html.includes('src="/game-images/a/b"'));
  assert.match(html,/<option value="team" selected="">Team/);assert.ok(html.includes('name="remove_banner"'));assert.ok(html.includes('name="banner"'));
  const fresh=renderToStaticMarkup(React.createElement(GameEditor));assert.ok(fresh.includes(GAME_BANNER_FALLBACK));assert.match(fresh,/<option value="" selected="">Unspecified/);
  const deletion=renderToStaticMarkup(React.createElement(DeleteGame,{id:'game-a',title:'Game A',references:2}));
  assert.ok(deletion.includes('2 event competitions'));assert.ok(deletion.includes('deletion is blocked'));assert.ok(deletion.includes('name="id" value="game-a"'));
  assert.match(deletion,/disabled="">Permanently Delete Game/);assert.ok(!deletion.includes('<dialog open'));
});
test('actual public game cards show correct images, Solo/Team badges, deadlines and registration destinations',async()=>{
  const badge=dataModule(`import React from '${import.meta.resolve('react')}';export function StatusBadge({status}){return React.createElement('span',null,status);}`);
  const {CompetitionList}=await import(await component('../src/components/tournaments/competition-list.tsx',{'next/image':stub,'@/lib/game-image':local('../src/lib/game-image.ts'),'@/lib/tournament-format':local('../src/lib/tournament-format.ts'),'@/lib/tournament-status':local('../src/lib/tournament-status.ts'),'@/components/ui/action-link':stub,'./status-badge':badge,'./use-tournament-clock':stub,'@/lib/tournaments/live-model':local('../src/lib/tournaments/live-model.ts')}));
  const now=Date.now(),competition={gameTitle:'Game A',startsAt:new Date(now+86400000).toISOString(),registrationOpensAt:new Date(now-10000).toISOString(),registrationClosesAt:new Date(now+10000).toISOString()};
  const tournament={source:'live',slug:'arena',title:'Event Arena',venue:'Colombo',eventStatus:'scheduled',startsAt:competition.startsAt,endsAt:new Date(now+172800000).toISOString(),competitions:[{...competition,id:'solo-a',registrationType:'solo',gameImage:{src:'/game-images/a/b',alt:'Game A image'}},{...competition,id:'team-b',gameTitle:'Game B',registrationType:'team'}]};
  const html=renderToStaticMarkup(React.createElement(CompetitionList,{tournament,initialNow:now}));
  assert.ok(html.includes('/game-images/a/b'));assert.ok(html.includes(GAME_BANNER_FALLBACK));assert.ok(html.includes('>Solo</span>'));assert.ok(html.includes('>Team</span>'));assert.ok(!html.includes('5v5'));
  for(const id of ['solo-a','team-b'])assert.ok(html.includes(`href="/tournaments/live/arena/register/${id}"`));
  assert.ok(html.includes('Registration deadline'));assert.ok(html.includes('open'));assert.ok(html.includes('competition-game-image'));assert.ok(html.includes('competition-game-content'));
  const registered=renderToStaticMarkup(React.createElement(CompetitionList,{tournament,initialNow:now,registeredCompetitionIds:['team-b'],registrationIds:{'team-b':'registration-b'}}));assert.ok(registered.includes('View Registration'));assert.ok(registered.includes('href="/dashboard/registrations#registration-registration-b"'));assert.ok(registered.includes('href="/dashboard/registrations/registration-b/edit"'));assert.ok(!registered.includes('href="/tournaments/live/arena/register/team-b"'));
  const closedEntry=renderToStaticMarkup(React.createElement(CompetitionList,{tournament,initialNow:now+10000,registeredCompetitionIds:['team-b'],registrationIds:{'team-b':'registration-b'}}));assert.ok(closedEntry.includes('View Registration'));assert.ok(!closedEntry.includes('Edit Registration'));
  const closed=renderToStaticMarkup(React.createElement(CompetitionList,{tournament,initialNow:now+10000}));assert.ok(!closed.includes('href="/tournaments/live/arena/register/solo-a"'));assert.ok(closed.includes('Registration Closed'));
});
