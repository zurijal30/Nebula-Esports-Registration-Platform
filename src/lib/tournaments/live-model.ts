import type { Tournament } from "@/types/tournament";
import type { ParticipantRole } from "../registrations/roster-rules.ts";
export interface LiveEventRow {
  id: string; slug: string; title: string; description: string; starts_at: string; ends_at: string;
  venue: string; status: "scheduled" | "cancelled"; banner_url: string | null; banner_alt: string | null;
  event_games: { id: string; status: "scheduled" | "cancelled"; registration_type: "solo" | "team"; starts_at: string; registration_opens_at: string;
    registration_closes_at: string; venue_override: string | null; registration_fee_lkr: number; games: { title: string; is_active: boolean; banner_url?: string | null; banner_alt?: string | null; max_team_size?:number|null; available_roles?:ParticipantRole[]|null } | null }[];
}
export function mapLiveEvent(row: LiveEventRow): Tournament {
  return { source: "live", slug: row.slug, title: row.title, description: row.description, startsAt: row.starts_at, endsAt: row.ends_at,
    venue: row.venue, eventStatus: row.status, displayImage: row.banner_url ? { src: row.banner_url, alt: row.banner_alt || row.title } : null,
    competitions: row.event_games.filter((c) => c.games?.is_active).map((c) => ({ id: c.id, gameTitle: c.games!.title,
      gameImage: c.games!.banner_url ? {src:c.games!.banner_url,alt:c.games!.banner_alt||`${c.games!.title} game banner`} : null,
      rosterRules:{maxTeamSize:c.games!.max_team_size??null,availableRoles:c.games!.available_roles??null},
      competitionStatus: c.status, registrationType: c.registration_type, startsAt: c.starts_at, registrationOpensAt: c.registration_opens_at,
      registrationClosesAt: c.registration_closes_at, venue: c.venue_override ?? undefined, registrationFeeLkr: Number(c.registration_fee_lkr) })),
  };
}
export function tournamentPath(tournament: Tournament) {
  return tournament.source === "live" ? `/tournaments/live/${tournament.slug}` : `/tournaments/${tournament.slug}`;
}
