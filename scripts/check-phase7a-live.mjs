// Read-only anonymous readiness checks. No accounts, records or objects are changed.
import {createClient} from '@supabase/supabase-js';
import {getSupabaseConfig} from '../src/lib/auth/config.ts';
try{process.loadEnvFile('.env.local');}catch{/* supplied environment */}
const config=getSupabaseConfig();
if(!config){console.log('FAIL public configuration unavailable');process.exit(1);}
const client=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
for(const [table,columns] of [['games','id,max_team_size,available_roles,banner_url'],['events','id,is_published'],['event_games','id,registration_type,status'],['event_banner_assets','id,state'],['game_banner_assets','id,state'],['event_public_refresh','version']]){
  const {error}=await client.from(table).select(columns).limit(0);
  console.log(JSON.stringify({check:'public-schema',table,passed:!error,code:error?.code??null}));if(error)process.exitCode=1;
}
for(const table of ['profiles','registrations','registration_players']){
  const {error}=await client.from(table).select('id').limit(0);
  console.log(JSON.stringify({check:'anonymous-private-read-denied',table,passed:error?.code==='42501',code:error?.code??null}));if(error?.code!=='42501')process.exitCode=1;
}
for(const [rpc,args] of [['admin_overview',{}],['admin_list_users',{}],['admin_export_registrations',{p_event:'00000000-0000-4000-8000-000000000000',p_competition:null}]]){
  const {error}=await client.rpc(rpc,args);
  console.log(JSON.stringify({check:'anonymous-read-rpc-denied',rpc,passed:error?.code==='42501',code:error?.code??null}));if(error?.code!=='42501')process.exitCode=1;
}
