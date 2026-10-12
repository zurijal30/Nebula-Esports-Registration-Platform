import type { GameCompetition, RegistrationStatus, Tournament, TournamentFilter } from "@/types/tournament";

export const registrationLabels: Record<RegistrationStatus, string> = {
  upcoming: "Registration upcoming",
  open: "Registration open",
  closed: "Registration closed",
  cancelled: "Cancelled",
};

/** Opening is inclusive; the deadline is exclusive. Cancellation always wins. */
export function getCompetitionStatus(tournament: Tournament, competition: GameCompetition, now: number): RegistrationStatus {
  if (tournament.eventStatus === "cancelled" || competition.competitionStatus === "cancelled") return "cancelled";
  const opening = Date.parse(competition.registrationOpensAt);
  const closing = Date.parse(competition.registrationClosesAt);
  const eventEnd = Date.parse(tournament.endsAt);
  // Fail closed for malformed or reversed windows from a future data source.
  if (![opening, closing, eventEnd, now].every(Number.isFinite) || opening >= closing) return "closed";
  if (now >= closing || now >= eventEnd) return "closed";
  return now < opening ? "upcoming" : "open";
}

/** Open if any competition is open, then upcoming if any will open. */
export function getTournamentStatus(tournament: Tournament, now: number): RegistrationStatus {
  if (tournament.eventStatus === "cancelled") return "cancelled";
  const statuses = tournament.competitions.map((competition) => getCompetitionStatus(tournament, competition, now));
  if (statuses.includes("open")) return "open";
  if (statuses.includes("upcoming")) return "upcoming";
  return "closed";
}

export function isUpcomingTournament(tournament: Tournament, now: number) {
  return tournament.eventStatus !== "cancelled" && Date.parse(tournament.startsAt) > now;
}

export function filterTournaments(tournaments: readonly Tournament[], query: string, filter: TournamentFilter, now: number) {
  const normalized = query.trim().toLocaleLowerCase("en");
  return tournaments.filter((tournament) => {
    if (!tournament.title.toLocaleLowerCase("en").includes(normalized)) return false;
    if (filter === "all") return true;
    if (filter === "upcoming") return isUpcomingTournament(tournament, now);
    return getTournamentStatus(tournament, now) === filter;
  });
}
