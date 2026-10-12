import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAccount } from "@/lib/auth/account";
import { getLiveEvents } from "@/lib/tournaments/live";
import { getMyRegistrations } from "@/lib/registrations/data";
import { getCompetitionStatus } from "@/lib/tournament-status";
import { getRequestNow } from "@/lib/server-time";
import { formatDateTime, formatFee } from "@/lib/tournament-format";
import { PageIntro } from "@/components/ui/page-intro";
import { RegistrationForm } from "@/components/registrations/registration-form";
export const metadata = { title: "Register for a competition" };
export default async function Register({ params }: { params: Promise<{ slug: string; competitionId: string }> }) {
  const { slug, competitionId } = await params;
  const account = await requireAccount(`/tournaments/live/${slug}/register/${competitionId}`);
  const { tournaments, error } = await getLiveEvents(slug);
  const tournament = tournaments[0]; const competition = tournament?.competitions.find((c) => c.id === competitionId);
  if (!error && (!tournament || !competition)) notFound();
  const owned = await getMyRegistrations(account.user.id);
  const existing = owned.registrations.find((r) => r.event_game_id === competitionId && r.status === "active");
  const status = tournament && competition ? getCompetitionStatus(tournament, competition, await getRequestNow()) : "closed";
  return <section className="container page-section registration-page">
    <Link className="back-link" href={`/tournaments/live/${slug}`}>← Back to competition</Link>
    <PageIntro eyebrow="CLAIM YOUR PLACE" title={competition ? `${competition.gameTitle} registration.` : "Registration unavailable."}><p>{tournament?.title}</p></PageIntro>
    {existing ? <div className="info-panel"><h2>You’re already registered.</h2><p>Manage your existing entry from My Registrations.</p><Link className="action-link" href="/dashboard/registrations">Manage Registration ↗</Link></div>
      : error || owned.error || !account.profile || !account.user.email ? <p className="form-message form-error">Registration setup is unavailable. Ask the organiser to check the database migrations and your account profile.</p>
      : status !== "open" ? <div className="info-panel"><h2>{status === "upcoming" ? "Registration Not Open" : "Registration Closed"}</h2><p>{status === "cancelled" ? "This event has been cancelled." : "Submissions are accepted only during this competition’s registration window."}</p></div>
      : competition && <><div className="registration-deadline"><span className="eyebrow">REGISTRATION DEADLINE · ASIA/COLOMBO</span><strong>{formatDateTime(competition.registrationClosesAt)}</strong><p>{formatFee(competition.registrationFeeLkr, competition.registrationType)} · Paid at the venue when applicable</p></div>
      <RegistrationForm competitionId={competition.id} type={competition.registrationType} rosterRules={competition.rosterRules} email={account.user.email} initialPlayers={[{ key: "captain", fullName: account.profile.display_name, ign: "", gameId: "", phone: account.profile.contact_phone ?? "" }]} /></>}
  </section>;
}
