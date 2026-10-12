export function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0,100).replace(/-$/g, "");
}
/** datetime-local inputs are always Colombo wall time, irrespective of browser timezone. */
export function colomboInputToIso(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}:00+05:30`);
  if (!Number.isFinite(parsed.getTime()) || toColomboInput(parsed.toISOString()) !== value) return null;
  return parsed.toISOString();
}
export function toColomboInput(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return "";
  return new Date(Date.parse(value) + 330 * 60_000).toISOString().slice(0,16);
}
export function validateEvent(values: { title: string; venue: string; description: string; starts_at: string | null; ends_at: string | null }) {
  if (!values.title || values.title.length>160) return "Enter an event title of up to 160 characters.";
  if (!values.venue || values.venue.length>240) return "Enter a venue of up to 240 characters.";
  if (values.description.length>10000) return "Keep the description under 10,000 characters.";
  if (!values.starts_at || !values.ends_at || Date.parse(values.ends_at)<=Date.parse(values.starts_at)) return "Choose valid Colombo dates. The event must end after it starts.";
  return null;
}
export function validateCompetition(v: {registration_opens_at:string|null;registration_closes_at:string|null;starts_at:string|null;registration_fee_lkr:number}) {
  if (!v.registration_opens_at || !v.registration_closes_at || !v.starts_at || Date.parse(v.registration_opens_at)>=Date.parse(v.registration_closes_at) || Date.parse(v.registration_closes_at)>Date.parse(v.starts_at)) return "Registration must open before it closes, and close no later than the competition start.";
  if (!Number.isFinite(v.registration_fee_lkr) || v.registration_fee_lkr<0 || v.registration_fee_lkr>9999999999.99) return "Enter a valid non-negative participation fee.";
  return null;
}
export function adminError(code?: string, message?: string) {
  if(message&&/^roster_maximum:[0-9]+$/.test(message))return `This game allows a maximum of ${message.split(":")[1]} individuals per team.`;
  const messages: Record<string,string> = {
    admin_required:"Administrator access is required. Sign in again if your role changed.",
    invalid_game_confirmation:"Enter the exact current game name to confirm deletion.",
    game_is_referenced:"This game is used by existing competitions, including historical records. Remove it from use by hiding it; permanent deletion is blocked.",
    invalid_game:"Check the game title and reference classification.",
    invalid_roster_config:"Choose a positive whole-number maximum and valid roles, including a Player slot.",
    roster_change_confirmation:"Existing rosters exceed the new maximum or use roles being removed. Confirm the change; their data will be preserved, and future edits must follow the new rules.",
    invalid_participant_role:"Choose an available role for each participant.",
    duplicate_participant_role:"Each participant must have a different role.",
    invalid_captain_role:"The captain must have a Player role.",
    invalid_delete_confirmation:"Enter the exact current event name to confirm deletion.",
    competition_has_registrations:"This competition has registrations. Its game and solo/team format cannot be changed.",
    self_role_change:"You cannot change your own role. Ask another administrator.",
    last_admin:"The last administrator cannot be removed.",
    request_conflict:"This submission key has already been used. Reload before creating another entry.",
    registration_unavailable:"This registration is unavailable or belongs to another competition.",
    banner_unavailable:"The uploaded banner is unavailable. Choose the file again and retry.",
    event_unavailable:"This event is unavailable.", game_unavailable:"This game is unavailable.", user_unavailable:"This user is unavailable.",
  };
  if (messages[message ?? ""]) return messages[message!];
  if (code==="23505") return "A game title, event URL or competition already exists. Use a different value.";
  if (code==="23503") return "This record is referenced by existing records and cannot be deleted.";
  if (code==="23514" || code==="23502" || code==="22P02") return "Check the required fields, dates and registration settings.";
  return "Unable to save. Please try again or check that the Phase 5 migration has been applied.";
}
