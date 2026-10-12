// Anonymous, read-only public inventory; never reads participant or account data.
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../src/lib/auth/config.ts';
import { parseSiteOrigin } from '../src/lib/auth/site-origin.ts';
import { supportedGames } from '../src/data/supported-games.ts';
try { process.loadEnvFile('.env.local'); } catch { /* Environment may be supplied. */ }
const config = getSupabaseConfig();
if (!config) { console.log('Public configuration unavailable; hosted review pending.'); process.exit(1); }
const client = createClient(config.url, config.key, { auth: { persistSession:false, autoRefreshToken:false, detectSessionInUrl:false }, global: { fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(15000)}) } });
async function rows(table, columns) {
  const result=[];
  for(let start=0;;start+=500) {
    const {data,error}=await client.from(table).select(columns).order('id').range(start,start+499);
    if(error) throw new Error(`${table}: ${error.code ?? 'query failed'}`);
    result.push(...data);
    if(data.length<500) return result;
  }
}
try {
  const [games,events,competitions]=await Promise.all([
    rows('games','id,slug,title,reference_type,max_team_size,available_roles,banner_url'),
    rows('events','id,slug,title,description,venue,is_published,status,starts_at,ends_at,banner_url'),
    rows('event_games','id,event_id,game_id,registration_type,status,registration_opens_at,registration_closes_at'),
  ]);
  const suspect=/(?:\b(?:demo|test|sample|fixture|fictional|disposable)\b|phase[ -]?\d)/i;
  const origin=parseSiteOrigin(process.env.SITE_URL,true);
  console.log(JSON.stringify({siteOriginConfigured:!!origin,siteOriginIsLocal:origin?['localhost','127.0.0.1'].includes(new URL(origin).hostname):null}));
  console.log(JSON.stringify({supportedGames:supportedGames.length,localLogos:supportedGames.filter(g=>g.logo).length,neutralFallbacks:supportedGames.filter(g=>!g.logo).map(g=>g.name)}));
  console.log(JSON.stringify({publicVisibleGames:games.map(game=>({slug:game.slug,title:game.title,reference_type:game.reference_type,max_team_size:game.max_team_size,available_roles:game.available_roles,hasBanner:!!game.banner_url})),duplicateVisibleSlugs:games.filter((g,i)=>games.findIndex(x=>x.slug===g.slug)!==i).map(g=>g.slug)}));
  console.log(JSON.stringify({publishedEvents:events.map(e=>({slug:e.slug,title:e.title,status:e.status,startsAt:e.starts_at,endsAt:e.ends_at,hasBanner:!!e.banner_url})),unexpectedUnpublishedRows:events.filter(e=>!e.is_published).length,suspectedDemoEvents:events.filter(e=>suspect.test([e.slug,e.title,e.description,e.venue].join(' '))).map(e=>({slug:e.slug,title:e.title}))}));
  console.log(JSON.stringify({publicCompetitions:competitions.length,formats:[...new Set(competitions.map(c=>c.registration_type))],orphanVisibleCompetitions:competitions.filter(c=>!events.some(e=>e.id===c.event_id)).length}));
  console.log('Unpublished events, inactive games, deployed SQL definitions, SMTP and authenticated journeys require administrator review. No data was changed.');
} catch(error) {
  console.log(`Hosted public inventory unavailable (${error instanceof Error?error.message:'request failed'}); verification pending.`);
  process.exitCode=1;
}
