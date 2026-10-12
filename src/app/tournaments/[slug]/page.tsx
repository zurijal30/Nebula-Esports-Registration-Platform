import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { demoTournaments, getTournament } from "@/data/tournaments";
import { formatDateTime } from "@/lib/tournament-format";
import { getRequestNow } from "@/lib/server-time";
import { TournamentArtwork } from "@/components/tournaments/tournament-artwork";
import { CompetitionList, TournamentRegistrationStatus } from "@/components/tournaments/competition-list";

export const dynamic = "force-dynamic";
export function generateStaticParams() { return demoTournaments.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tournament = getTournament(slug);
  return { title: tournament ? `${tournament.title} — Demo` : "Tournament not found" };
}
export default async function TournamentDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tournament = getTournament(slug);
  if (!tournament) notFound();
  const now = await getRequestNow();

  return (
    <div className="container page-section tournament-detail">
      <Link className="back-link" href="/tournaments"><ArrowLeft size={17} aria-hidden="true" />Back to tournaments</Link>
      <p className="demo-notice"><span className="notice-label">DEMONSTRATION EVENT</span> Fictional event, schedule, venue, and fees. This is not a Nebula Esports announcement.</p>
      <div className="detail-hero">
        <TournamentArtwork tournament={tournament} large />
        <div className="detail-intro">
          <span className="eyebrow">NEBULA ESPORTS / EVENT PREVIEW</span>
          <h1>{tournament.title}</h1>
          <p>{tournament.description}</p>
          <TournamentRegistrationStatus tournament={tournament} initialNow={now} />
        </div>
      </div>
      <dl className="event-facts">
        <div><dt>Event begins</dt><dd><time dateTime={tournament.startsAt}>{formatDateTime(tournament.startsAt)}</time></dd></div>
        <div><dt>Event ends</dt><dd><time dateTime={tournament.endsAt}>{formatDateTime(tournament.endsAt)}</time></dd></div>
        <div><dt>Main venue</dt><dd>{tournament.venue}</dd></div>
      </dl>
      <div className={`registration-notice${tournament.eventStatus === "cancelled" ? " cancellation-notice" : ""}`}>
        <h2>{tournament.eventStatus === "cancelled" ? "Demonstration event cancelled" : "Registration information"}</h2>
        <p>{tournament.eventStatus === "cancelled" ? "All game competitions are cancelled, regardless of their original registration windows. Dates below are retained for reference." : "Each game has its own registration window. These fictional competitions are for browsing only. Find published, registration-eligible events under Live tournaments in the directory."}</p>
        <span className="timezone-label">All event and registration times: Asia/Colombo (UTC+05:30).</span>
      </div>
      <CompetitionList tournament={tournament} initialNow={now} />
      <Link className="back-link detail-back" href="/tournaments"><ArrowLeft size={17} aria-hidden="true" />Back to all tournaments</Link>
    </div>
  );
}
