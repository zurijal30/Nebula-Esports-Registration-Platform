import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import sharp from 'sharp';
import {supportedGames} from '../src/data/supported-games.ts';
const moduleUrl=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const stub=moduleUrl(`import React from '${import.meta.resolve('react')}';
export const state={tournaments:[],error:false};export const getLiveEvents=async()=>state;export const getRequestNow=async()=>Date.parse('2026-10-12T00:00:00Z');
export const notFound=()=>{throw new Error('NOT_FOUND');};export const redirect=url=>{throw Object.assign(new Error('REDIRECT'),{destination:url});};
export function TournamentCard({tournament}){return React.createElement('article',{className:'tournament-card'},tournament.title);}
export function TournamentDirectory({tournaments}){return React.createElement('div',null,tournaments.map(t=>React.createElement(TournamentCard,{key:t.slug,tournament:t})));}
export function PageIntro({title,children}){return React.createElement('div',null,React.createElement('h1',null,title),children);}
export function ActionLink({href,children}){return React.createElement('a',{href},children);}
export default function Asset({src,alt,href,children}){return src?React.createElement('img',{src,alt}):React.createElement('a',{href},children);}`);
const {state}=await import(stub);
async function component(path,replacements={}){
  let source=await readFile(new URL(path,import.meta.url),'utf8');
  for(const [from,to] of Object.entries(replacements))source=source.replaceAll('"'+from+'"',JSON.stringify(to));
  return moduleUrl(ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from (["'])(react(?:\/jsx-runtime)?|lucide-react)\1/g,(_,q,name)=>`from ${q}${import.meta.resolve(name)}${q}`));
}
const ticker=await component('../src/components/tournaments/game-ticker.tsx',{'next/image':stub,'@/data/supported-games':new URL('../src/data/supported-games.ts',import.meta.url).href});
const empty=await component('../src/components/tournaments/tournament-empty-state.tsx');
test('shared card and detail artwork retain supplied banners without the event overlay',async()=>{
  const artwork=await component('../src/components/tournaments/tournament-artwork.tsx',{'next/image':stub,'@/lib/tournament-image':new URL('../src/lib/tournament-image.ts',import.meta.url).href});
  const {TournamentArtwork}=await import(artwork);
  for(const large of [false,true]){
    const html=renderToStaticMarkup(React.createElement(TournamentArtwork,{large,tournament:{title:'Published Event',displayImage:{src:'/images/events/default-banner.svg',alt:'Supplied banner'}}}));
    assert.ok(html.includes('alt="Supplied banner"'));assert.ok(html.includes('/images/events/default-banner.svg'));
    assert.doesNotMatch(html,/NEBULA EVENT|event-tag/);
  }
});
const heroAsset=moduleUrl('export default "/mock-hero.png";');
const replacements={'next/image':stub,'next/link':stub,'next/navigation':stub,'@/lib/tournaments/live':stub,'@/lib/server-time':stub,'@/components/tournaments/tournament-card':stub,'@/components/tournaments/tournament-directory':stub,'@/components/ui/page-intro':stub,'@/components/ui/action-link':stub,'@/components/tournaments/game-ticker':ticker,'@/components/tournaments/tournament-empty-state':empty,'@/lib/tournament-status':new URL('../src/lib/tournament-status.ts',import.meta.url).href};
test('catalog has requested platforms, local official/original assets and edition-neutral FC',async()=>{
  assert.deepEqual(supportedGames.filter(g=>g.platform==='PC').map(g=>g.name),['VALORANT','Dota 2','Call of Duty','League of Legends']);
  assert.deepEqual(supportedGames.filter(g=>g.platform==='Mobile').map(g=>g.name),['PUBG Mobile','Free Fire','Mobile Legends: Bang Bang','Call of Duty: Mobile','eFootball Mobile']);
  assert.deepEqual(supportedGames.filter(g=>g.platform==='Console').map(g=>g.name),['EA Sports FC','Mortal Kombat','Tekken','F1']);
  assert.equal(new Set(supportedGames.map(g=>g.slug)).size,supportedGames.length);
  assert.equal(supportedGames.filter(g=>g.logo?.kind==='official').length,3);
  assert.equal(supportedGames.filter(g=>g.logo?.kind==='provided').length,10);
  assert.equal(supportedGames.filter(g=>g.logo?.kind==='custom').length,0);
  assert.ok(supportedGames.every(g=>g.logo));
  for(const game of supportedGames.filter(g=>g.logo)){
    assert.match(game.logo.src,/^\/assets\/games\/[a-z0-9-]+\.(svg|webp|png)$/);
    const path=new URL('../public'+game.logo.src,import.meta.url);assert.ok((await stat(path)).size>0);
    const bytes=await readFile(path),metadata=await sharp(bytes).metadata();await sharp(bytes).png().toBuffer();
    assert.equal(metadata.width,game.logo.width);assert.equal(metadata.height,game.logo.height);assert.equal(metadata.hasAlpha,true);
    if(metadata.format==='svg')assert.doesNotMatch(bytes.toString(),/<script|<foreignObject|(?:href|src)=["'](?:https?:|\/\/)/i);
  }
});
test('actual ticker has identical groups, one accessible list and no controller placeholders',async()=>{
  const {GameTicker}=await import(ticker);const html=renderToStaticMarkup(React.createElement(GameTicker));
  assert.equal((html.match(/class="ticker-game"/g)||[]).length,26);
  assert.ok(html.includes('class="game-ticker-group game-ticker-copy" aria-hidden="true"'));
  assert.ok(html.includes('tabindex="0"'));assert.ok(html.includes('Supported games'));assert.ok(html.includes('scrolls continuously'));assert.ok(!html.includes('pause scrolling'));
  assert.equal((html.match(/class="[^"]*\bticker-fallback\b[^"]*"/g)||[]).length,0);
  assert.equal((html.match(/data-artwork="custom"/g)||[]).length,0);
  assert.equal((html.match(/data-artwork="provided"/g)||[]).length,20);
  assert.equal((html.match(/<img /g)||[]).length,26);assert.ok(!html.includes('https://'));
});
test('actual public home/discovery render published data only, empty lists and errors without mock substitutes',async()=>{
  const Home=(await import(await component('../src/app/page.tsx',{...replacements,'../../assets/nebula-web-banner.png':heroAsset}))).default;
  const Directory=(await import(await component('../src/app/tournaments/page.tsx',replacements))).default;
  state.tournaments=[];state.error=false;
  for(const Page of [Home,Directory]){const html=renderToStaticMarkup(await Page());assert.ok(html.includes('No tournaments announced yet.'));assert.ok(!html.includes('class="tournament-card"'));assert.doesNotMatch(html,/DEMO|Demonstration|Arena Series|Mobile Showdown|Versus Cup|Arena Rematch/);}
  state.tournaments=[{slug:'published',title:'Real Published Event',startsAt:'2027-02-01T00:00:00Z',eventStatus:'scheduled',competitions:[]}];
  for(const Page of [Home,Directory]){const html=renderToStaticMarkup(await Page());assert.ok(html.includes('Real Published Event'));assert.doesNotMatch(html,/No tournaments announced yet|DEMONSTRATION/);}
  state.error=true;
  for(const Page of [Home,Directory]){const html=renderToStaticMarkup(await Page());assert.ok(html.includes('temporarily unavailable'));assert.ok(!html.includes('class="tournament-card"'));}
});
test('legacy tournament links resolve only real published events and matching competitions',async()=>{
  const Alias=(await import(await component('../src/app/tournaments/[slug]/page.tsx',replacements))).default;
  const Register=(await import(await component('../src/app/tournaments/[slug]/register/[competitionId]/page.tsx',replacements))).default;
  state.error=false;state.tournaments=[];await assert.rejects(Alias({params:Promise.resolve({slug:'arena-series'})}),/NOT_FOUND/);
  await assert.rejects(Register({params:Promise.resolve({slug:'arena-series',competitionId:'valorant'})}),/NOT_FOUND/);
  state.tournaments=[{slug:'real',competitions:[{id:'valid-id'}]}];
  await assert.rejects(Alias({params:Promise.resolve({slug:'real'})}),e=>e.destination==='/tournaments/live/real');
  await assert.rejects(Register({params:Promise.resolve({slug:'real',competitionId:'valid-id'})}),e=>e.destination==='/tournaments/live/real/register/valid-id');
  await assert.rejects(Register({params:Promise.resolve({slug:'real',competitionId:'other-id'})}),/NOT_FOUND/);
});
