// Read-only public checks. Never print keys or private records.
import {createClient} from '@supabase/supabase-js';
import {getSupabaseConfig} from '../src/lib/auth/config.ts';
try{process.loadEnvFile('.env.local');}catch{/* environment supplied */}
const config=getSupabaseConfig();if(!config)throw new Error('Public Supabase configuration missing');
const client=createClient(config.url,config.key,{auth:{persistSession:false}});
const refresh=await client.from('event_public_refresh').select('version').limit(0);
console.log(JSON.stringify({publicRefreshReady:!refresh.error,code:refresh.error?.code??null}));
const assets=await client.from('event_banner_assets').select('id,event_id,path,state').limit(0);
console.log(JSON.stringify({bannerSchemaReady:!assets.error,code:assets.error?.code??null}));
for(const name of ['admin_overview','admin_list_users','admin_unused_banners']){
 const {error}=await client.rpc(name);
 console.log(JSON.stringify({rpc:name,anonymousDenied:error?.code==='42501',notDeployed:error?.code==='PGRST202',code:error?.code??null}));
}
