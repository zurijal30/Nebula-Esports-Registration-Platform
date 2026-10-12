import { notFound } from "next/navigation";
import Link from "next/link";
import { getLiveEvents } from "@/lib/tournaments/live";
import { getCurrentAccount } from "@/lib/auth/account";
import { getMyRegistrations } from "@/lib/registrations/data";
import { getRequestNow } from "@/lib/server-time";
import { formatDateTime } from "@/lib/tournament-format";
import { TournamentArtwork } from "@/components/tournaments/tournament-artwork";
import { CompetitionList, TournamentRegistrationStatus } from "@/components/tournaments/competition-list";
export const metadata = { title: "Tournament" };
export default async function LiveTournament({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tournaments, error } = await getLiveEvents(slug);
  if (error) return <section className="container page-section"><h1>Event temporarily unavailable.</h1><p>Please try again shortly.</p><Link href="/tournaments">Back to tournaments</Link></section>;
  const tournament = tournaments[0]; if (!tournament) notFound();
  const account = await getCurrentAccount();
  const registrations = account.user ? await getMyRegistrations(account.user.id) : { registrations: [], error: false };
  const now = await getRequestNow();
  return <div className="container page-section tournament-detail">
    <Link className="back-link" href="/tournaments">← Back to tournaments</Link>
    <div className="detail-hero"><TournamentArtwork tournament={tournament} large /><div className="detail-intro"><span className="eyebrow">NEBULA ESPORTS / LIVE EVENT</span><h1>{tournament.title}</h1><p>{tournament.description}</p><TournamentRegistrationStatus tournament={tournament} initialNow={now} /></div></div>
    <dl className="event-facts"><div><dt>Event begins</dt><dd>{formatDateTime(tournament.startsAt)}</dd></div><div><dt>Event ends</dt><dd>{formatDateTime(tournament.endsAt)}</dd></div><div><dt>Main venue</dt><dd>{tournament.venue}</dd></div></dl>
    {registrations.error && <p className="form-message form-error">Existing registrations are temporarily unavailable. Check My Registrations before submitting.</p>}
    <CompetitionList tournament={tournament} initialNow={now} registeredCompetitionIds={registrations.registrations.filter((r) => r.status === "active").map((r) => r.event_game_id)} registrationIds={Object.fromEntries(registrations.registrations.filter(r=>r.status==="active").map(r=>[r.event_game_id,r.id]))} />
  </div>;
}
