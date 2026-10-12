import "server-only";
import { requireAdmin } from "@/lib/auth/account";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RegistrationRecord } from "@/lib/registrations/data";
import type { ParticipantRole } from "@/lib/registrations/roster-rules";
import { allRows } from "@/lib/supabase/pagination";
export interface AdminGame {id:string;slug:string;title:string;is_active:boolean;reference_type?:"solo"|"team"|null;banner_url?:string|null;banner_alt?:string|null;max_team_size?:number|null;available_roles?:ParticipantRole[]|null}
export interface AdminCompetition {id:string;event_id:string;game_id:string;registration_type:"solo"|"team";starts_at:string;registration_opens_at:string;registration_closes_at:string;venue_override:string|null;registration_fee_lkr:number;status:"scheduled"|"cancelled"}
export interface AdminEvent {id:string;slug:string;title:string;description:string;venue:string;starts_at:string;ends_at:string;status:"scheduled"|"cancelled";is_published:boolean;banner_url:string|null;banner_alt:string|null;event_games:AdminCompetition[]}
export interface AdminUser {id:string;display_name:string;email:string|null;role:"player"|"admin";contact_phone:string|null;created_at:string}
export async function adminData() {
  const account = await requireAdmin(); const client = await createServerSupabaseClient();
  if (!client) throw new Error("Supabase unavailable");
  const results = await Promise.all([
    allRows<AdminEvent>(client.from("events").select("*,event_games(*)").order("starts_at",{ascending:false}).order("id")),
    allRows<AdminGame>(client.from("games").select("*").order("title").order("id")),
    allRows<RegistrationRecord>(client.from("registrations").select("id,event_game_id,captain_id,registration_type,team_name,clan_name,status,source,created_at,updated_at,registration_players(id,display_name,ign,game_player_id,contact_phone,player_order,is_captain,participant_role)").order("created_at",{ascending:false}).order("id")),
    allRows<AdminUser>(client.rpc("admin_list_users")),
  ]);
  return {account,events:(results[0].data??[]) as AdminEvent[], games:(results[1].data??[]) as AdminGame[],
    registrations:(results[2].data??[]) as RegistrationRecord[],users:(results[3].data??[]) as AdminUser[],error:results.some(r=>Boolean(r.error))};
}
