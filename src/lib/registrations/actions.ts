"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isUuid, registrationError, validateRegistration, type PlayerInput } from "./policy";
export interface RegistrationFormState { error?: string }
const string = (form: FormData, name: string) => typeof form.get(name) === "string" ? String(form.get(name)).trim() : "";
export async function saveRegistrationAction(_state: RegistrationFormState, form: FormData): Promise<RegistrationFormState> {
  const competitionId = string(form, "competitionId"); const registrationId = string(form, "registrationId");
  if (!isUuid(competitionId) || (registrationId && !isUuid(registrationId))) return { error: "Choose a published live competition." };
  let players: PlayerInput[];
  try {
    const value: unknown = JSON.parse(string(form, "players"));
    if (!Array.isArray(value) || value.some((p) => !p || typeof p !== "object")) return { error: "Check your player details." };
    players = value as PlayerInput[];
  } catch { return { error: "Check your player details." }; }
  const client = await createServerSupabaseClient({ writable: true });
  if (!client) return { error: "Registration services are unavailable." };
  try {
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (!user || authError) return { error: "Please sign in again before registering." };
    // Type comes from the database, never from hidden form fields.
    const { data: competition, error } = await client.from("event_games").select("registration_type,game_id").eq("id", competitionId).maybeSingle();
    if (error || !competition) return { error: "This competition is unavailable." };
    const input = { teamName: string(form, "teamName"), clanName: string(form, "clanName"), players };
    const {data:game,error:gameError}=await client.from("games").select("max_team_size,available_roles").eq("id",competition.game_id).maybeSingle();
    if(gameError||!game)return {error:"Game roster settings are unavailable. Check the Phase 6.5 migration."};
    const validation = validateRegistration(competition.registration_type, input,{maxTeamSize:game.max_team_size,availableRoles:game.available_roles});
    if (validation) return { error: validation };
    // RPC derives owner, source, type and ordering; saves all rows in one transaction.
    const { error: saveError } = await client.rpc("save_registration", { p_competition: competitionId,
      p_registration: registrationId || null, p_team: input.teamName || null, p_clan: input.clanName || null,
      p_players: players.map(({ fullName, ign, gameId, phone, role }) => ({ fullName: fullName.trim(), ign: ign.trim(), gameId: gameId.trim(), phone: phone.trim(),role:role||null })) });
    if (saveError) return { error: registrationError(saveError.code, saveError.message) };
  } catch { return { error: registrationError() }; }
  revalidatePath("/dashboard/registrations"); revalidatePath("/tournaments", "layout");
  redirect(`/dashboard/registrations?notice=${registrationId ? "updated" : "created"}`);
}
export async function cancelRegistrationAction(_state: RegistrationFormState, form: FormData): Promise<RegistrationFormState> {
  const id = string(form, "registrationId");
  if (!isUuid(id) || string(form, "confirm") !== "yes") return { error: "Confirm cancellation before continuing." };
  const client = await createServerSupabaseClient({ writable: true });
  if (!client) return { error: "Registration services are unavailable." };
  try {
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return { error: "Please sign in again." };
    const { error: cancellationError } = await client.rpc("cancel_registration", { p_registration: id });
    if (cancellationError) return { error: registrationError(cancellationError.code, cancellationError.message) };
  } catch { return { error: registrationError() }; }
  revalidatePath("/dashboard/registrations"); revalidatePath("/tournaments", "layout");
  redirect("/dashboard/registrations?notice=cancelled");
}
