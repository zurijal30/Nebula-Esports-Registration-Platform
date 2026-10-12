// Read-only/anonymous diagnostic. Anonymous RPCs must be rejected before any write.
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../src/lib/auth/config.ts';
try { process.loadEnvFile('.env.local'); } catch { /* injected environment */ }
const config = getSupabaseConfig();
if (!config) throw new Error('Supabase public configuration missing');
const client = createClient(config.url, config.key, { auth: { persistSession: false } });
const { error } = await client.from('events').select('id,slug,event_games(id,status,registration_type,games(title,is_active))').eq('is_published',true).limit(0);
console.log(JSON.stringify({ phase4PublicSchemaReady: !error, code: error?.code ?? null }));
for (const [name, args] of [
  ['save_registration', { p_competition: '00000000-0000-4000-8000-000000000000', p_players: [] }],
  ['cancel_registration', { p_registration: '00000000-0000-4000-8000-000000000000' }],
]) {
  const { error } = await client.rpc(name,args);
  console.log(JSON.stringify({ rpc: name, anonymousDenied: error?.code === '42501', functionUnavailable: error?.code === 'PGRST202', code: error?.code ?? null }));
}
