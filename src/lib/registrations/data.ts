import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export interface RegistrationRecord {
  id: string; event_game_id: string; captain_id: string | null; registration_type: "solo" | "team";
  team_name: string | null; clan_name: string | null; status: "active" | "cancelled"; source: "player" | "admin";
  created_at: string; updated_at: string;
  registration_players: { id: string; display_name: string; ign: string | null; game_player_id: string | null; contact_phone: string | null; player_order: number; is_captain: boolean; participant_role?:string|null }[];
}
export async function getMyRegistrations(ownerId: string) {
  const client = await createServerSupabaseClient();
  if (!client) return { registrations: [], error: true };
  try {
    const { data, error } = await client.from("registrations").select("id,event_game_id,captain_id,registration_type,team_name,clan_name,status,source,created_at,updated_at,registration_players(id,display_name,ign,game_player_id,contact_phone,player_order,is_captain,participant_role)")
      .eq("captain_id", ownerId).order("created_at", { ascending: false });
    return { registrations: (error ? [] : data) as unknown as RegistrationRecord[], error: Boolean(error) };
  } catch { return { registrations: [], error: true }; }
}
