import { validateTeamRoster, type RosterRules } from "./roster-rules.ts";
export interface PlayerInput { key: string; fullName: string; ign: string; gameId: string; phone: string; role?:string|null }
export interface RegistrationInput { teamName: string; clanName: string; players: PlayerInput[] }
export const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function validateRegistration(type: "solo" | "team", input: RegistrationInput, rules:RosterRules={}) {
  if (!Array.isArray(input.players) || !input.players.length) return "Include the captain or solo player.";
  if (type === "solo" && (input.players.length !== 1 || input.teamName.trim())) return "Solo registration must contain exactly one player and no team name.";
  if (type === "team" && (!input.teamName.trim() || input.teamName.trim().length > 120)) return "Enter a team name of up to 120 characters.";
  if (input.clanName.trim().length > 120) return "Use a clan name of up to 120 characters.";
  if(type==="solo"&&input.players.some(p=>p.role))return "Solo players do not use team participant roles.";
  if(type==="team"){const invalid=validateTeamRoster(input.players,rules);if(invalid)return invalid;}
  for (const [index, player] of input.players.entries()) {
    const label = index === 0 ? (type === "team" ? "Captain" : "Player") : `Player ${index + 1}`;
    for (const [key, name] of [["fullName", "full name"], ["ign", "IGN"], ["gameId", "game ID / UID"]] as const) {
      if (typeof player[key] !== "string" || !player[key].trim() || player[key].trim().length > 120) return `${label}: enter a ${name} of up to 120 characters.`;
    }
    if (typeof player.phone !== "string" || !/^[+\d ()-]{7,30}$/.test(player.phone.trim())) return `${label}: enter a valid phone number (7–30 characters).`;
  }
  return null;
}
export function removeTeammate(players: PlayerInput[], key: string) {
  return players.filter((player, index) => index === 0 || player.key !== key);
}
export function moveTeammate(players: PlayerInput[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (index < 1 || target < 1 || index >= players.length || target >= players.length) return players;
  const next = [...players];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
export function registrationError(code?: string, message?: string) {
  if (code === "23505") return "You already have an active registration for this competition. Open My Registrations to manage it.";
  const errors: Record<string, string> = {
    authentication_required: "Please sign in again before saving.",
    competition_unavailable: "This competition is unavailable or has been cancelled.",
    registration_not_open: "Registration has not opened yet.",
    registration_closed: "The registration deadline has passed. Changes are no longer allowed.",
    registration_unavailable: "This registration is unavailable. You can only manage your own active registrations.",
    competition_type_changed: "The competition format has changed. Contact the organiser before editing.",
    invalid_players: "Check the full name, IGN, game ID and phone number for every player.",
    invalid_solo: "Solo registration must contain exactly one player.",
    invalid_team: "Enter a valid team name.", invalid_clan: "Use a clan name of up to 120 characters.",
    invalid_participant_role:"Choose an available role for every team participant.",
    duplicate_participant_role:"Each team participant must have a different role.",
    invalid_captain_role:"The captain must have a Player role.",
  };
  if(message&&/^roster_maximum:[0-9]+$/.test(message))return `This game allows a maximum of ${message.split(":")[1]} individuals per team.`;
  return errors[message ?? ""] ?? "Unable to save your registration. Please try again or contact the organiser if this continues.";
}
