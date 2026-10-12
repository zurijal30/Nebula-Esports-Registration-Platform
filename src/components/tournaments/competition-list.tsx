"use client";

import { Users, UserRound } from "lucide-react";
import Image from "next/image";
import { gameImage, GAME_BANNER_FALLBACK } from "@/lib/game-image";
import type { Tournament } from "@/types/tournament";
import { formatDateTime, formatFee } from "@/lib/tournament-format";
import { getCompetitionStatus, getTournamentStatus } from "@/lib/tournament-status";
import { ActionLink } from "@/components/ui/action-link";
import { StatusBadge } from "./status-badge";
import { useTournamentClock } from "./use-tournament-clock";
import { tournamentPath } from "@/lib/tournaments/live-model";

export function TournamentRegistrationStatus({ tournament, initialNow }: { tournament: Tournament; initialNow: number }) {
  const now = useTournamentClock(initialNow);
  return <StatusBadge status={getTournamentStatus(tournament, now)} />;
}

export function CompetitionList({ tournament, initialNow, registeredCompetitionIds = [], registrationIds = {} }: { tournament: Tournament; initialNow: number; registeredCompetitionIds?: string[]; registrationIds?: Record<string,string> }) {
  const now = useTournamentClock(initialNow);
  return (
    <section className="competitions-section" aria-labelledby="competitions-heading">
      <div className="section-heading">
        <div><span className="eyebrow">CHOOSE YOUR GAME</span><h2 id="competitions-heading">Game competitions<span className="accent">.</span></h2></div>
        <span className="timezone-label">Asia/Colombo · UTC+05:30</span>
      </div>
      <div className="competition-list">
        {tournament.competitions.map((competition) => {
          const status = getCompetitionStatus(tournament, competition, now);
          const TypeIcon = competition.registrationType === "team" ? Users : UserRound;
          const image = gameImage(competition.gameImage);
          return (
            <article className="competition-panel competition-game-card" key={competition.id} id={`competition-${competition.id}`}>
              <div className="competition-game-image"><Image fill unoptimized src={image.src} alt={image.alt} sizes="(max-width:600px) 100vw, (max-width:900px) 160px, 240px" onError={e=>{e.currentTarget.src=GAME_BANNER_FALLBACK;}}/></div>
              <div className="competition-game-content"><span className="eyebrow">{tournament.title}</span>
              <div className="competition-heading">
                <div className="competition-title"><h3>{competition.gameTitle}</h3></div>
                <span className="game-format-badge"><TypeIcon size={16} aria-hidden="true"/>{competition.registrationType === "team" ? "Team" : "Solo"}</span>
              </div>
              <StatusBadge status={status} />
              <dl className="competition-facts">
                <div><dt>Competition starts</dt><dd><time dateTime={competition.startsAt}>{formatDateTime(competition.startsAt)}</time></dd></div>
                <div><dt>Venue{competition.venue ? " · separate stage" : " · main event"}</dt><dd>{competition.venue ?? tournament.venue}</dd></div>
                <div><dt>Registration opens</dt><dd><time dateTime={competition.registrationOpensAt}>{formatDateTime(competition.registrationOpensAt)}</time></dd></div>
                <div><dt>Registration deadline</dt><dd><time dateTime={competition.registrationClosesAt}>{formatDateTime(competition.registrationClosesAt)}</time></dd></div>
                <div><dt>Participation fee · paid at venue</dt><dd>{formatFee(competition.registrationFeeLkr, competition.registrationType)}</dd></div>
              </dl>
              <div className="competition-action">
                <p>{status === "open" ? "Register with your player account. Team entries need only a captain’s account." : status === "upcoming" ? "Registration Not Open. Check the opening time above." : status === "cancelled" ? "This event has been cancelled. The original schedule is shown for reference." : "Registration Closed. The registration window has ended."}</p>
                {registeredCompetitionIds.includes(competition.id) ? <div className="competition-registration-links"><ActionLink href={registrationIds[competition.id]?`/dashboard/registrations#registration-${registrationIds[competition.id]}`:"/dashboard/registrations"} secondary>View Registration</ActionLink>{status==="open"&&registrationIds[competition.id]&&<ActionLink href={`/dashboard/registrations/${registrationIds[competition.id]}/edit`} secondary>Edit Registration</ActionLink>}</div>
                  : status === "open" && <ActionLink href={`${tournamentPath(tournament)}/register/${competition.id}`}>Register<span className="sr-only"> for {competition.gameTitle}</span></ActionLink>}
              </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
