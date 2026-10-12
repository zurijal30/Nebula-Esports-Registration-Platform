import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapLiveEvent, type LiveEventRow } from "./live-model";
const columns = "id,slug,title,description,starts_at,ends_at,venue,status,banner_url,banner_alt,event_games(id,status,registration_type,starts_at,registration_opens_at,registration_closes_at,venue_override,registration_fee_lkr,games(title,is_active,banner_url,banner_alt,max_team_size,available_roles))";
export async function getLiveEvents(slug?: string) {
  const client = await createServerSupabaseClient();
  if (!client) return { tournaments: [], error: true };
  try {
    let query = client.from("events").select(columns).eq("is_published", true).order("starts_at");
    if (slug) query = query.eq("slug", slug);
    const { data, error } = await query;
    return { tournaments: error ? [] : (data as unknown as LiveEventRow[]).map(mapLiveEvent), error: Boolean(error) };
  } catch { return { tournaments: [], error: true }; }
}
