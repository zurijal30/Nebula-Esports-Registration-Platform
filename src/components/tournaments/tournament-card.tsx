import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import type { Tournament } from "@/types/tournament";
import { formatEventDates } from "@/lib/tournament-format";
import { getTournamentStatus } from "@/lib/tournament-status";
import { StatusBadge } from "./status-badge";
import { tournamentPath } from "@/lib/tournaments/live-model";
import { TournamentArtwork } from "./tournament-artwork";

export function TournamentCard({ tournament, now }: { tournament: Tournament; now: number }) {
  const games = [...new Set(tournament.competitions.map((competition) => competition.gameTitle))];
  return (
    <article className="tournament-card">
      <TournamentArtwork tournament={tournament} />
      <div className="card-body">
        <div className="card-status"><StatusBadge status={getTournamentStatus(tournament, now)} /></div>
        <h3>{tournament.title}</h3>
        <p className="event-meta"><CalendarDays size={15} aria-hidden="true" />{formatEventDates(tournament.startsAt, tournament.endsAt)}</p>
        <p className="event-meta"><MapPin size={15} aria-hidden="true" />{tournament.venue}</p>
        <div className="game-tags">{games.map((game) => <span key={game}>{game}</span>)}</div>
        <Link className="card-link" href={tournamentPath(tournament)}>
          View Tournament <ArrowUpRight size={18} aria-hidden="true" />
          <span className="sr-only">: {tournament.title}{tournament.source !== "live" && ", demonstration"}</span>
        </Link>
      </div>
    </article>
  );
}
