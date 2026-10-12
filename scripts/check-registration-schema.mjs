// Read-only column compatibility probe. No row contents or credentials are printed.
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../src/lib/auth/config.ts';
try { process.loadEnvFile('.env.local'); } catch { /* environment supplied */ }
const config = getSupabaseConfig();
if (!config) throw new Error('Public Supabase configuration missing');
const client = createClient(config.url, config.key, { auth: { persistSession: false } });
for (const [table, columns] of Object.entries({
  events: 'id,slug,title,description,starts_at,ends_at,venue,status,is_published,banner_url,banner_alt',
  games: 'id,title,is_active',
  event_games: 'id,event_id,game_id,registration_type,starts_at,registration_opens_at,registration_closes_at,venue_override,registration_fee_lkr',
  registrations: 'id,event_game_id,captain_id,created_by,team_name,clan_name,status,details,created_at,updated_at',
  registration_players: 'id,registration_id,display_name,game_player_id,contact_phone,details,created_at,updated_at',
})) {
  const { error } = await client.from(table).select(columns).limit(0);
  console.log(JSON.stringify({ table, compatible: !error, code: error?.code ?? null }));
}
