import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAccount } from "@/lib/auth/account";
import { getMyRegistrations } from "@/lib/registrations/data";
import { getLiveEvents } from "@/lib/tournaments/live";
import { getRequestNow } from "@/lib/server-time";
import { getCompetitionStatus } from "@/lib/tournament-status";
import { formatDateTime } from "@/lib/tournament-format";
import { PageIntro } from "@/components/ui/page-intro";
import { RegistrationForm } from "@/components/registrations/registration-form";
export const metadata = { title: "Edit registration" };
export default async function EditRegistration({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const account = await requireAccount(`/dashboard/registrations/${id}/edit`);
  const owned = await getMyRegistrations(account.user.id);
  const events = await getLiveEvents(); const r = owned.registrations.find((r) => r.id === id);
  if (!owned.error && !r) notFound();
  const tournament = events.tournaments.find((t) => t.competitions.some((c) => c.id === r?.event_game_id));
  const competition = tournament?.competitions.find((c) => c.id === r?.event_game_id);
  const editable = r?.status === "active" && tournament && competition && competition.registrationType === r.registration_type && getCompetitionStatus(tournament, competition, await getRequestNow()) === "open";
  return <section className="container page-section registration-page"><Link className="back-link" href="/dashboard/registrations">← My Registrations</Link><PageIntro eyebrow="KEEP YOUR ENTRY CURRENT" title="Edit registration."><p>{tournament?.title} {competition && `· ${competition.gameTitle}`}</p></PageIntro>
    {owned.error || events.error ? <p className="form-message form-error">Your registration is temporarily unavailable. Please try again.</p> : !editable || !r || !account.user.email ? <div className="info-panel"><h2>Editing unavailable.</h2><p>You can edit your own active entry only while this competition’s registration window is open.</p></div>
    : <><div className="registration-deadline"><span className="eyebrow">SAVE BEFORE · ASIA/COLOMBO</span><strong>{formatDateTime(competition.registrationClosesAt)}</strong></div><RegistrationForm competitionId={r.event_game_id} registrationId={r.id} type={r.registration_type} rosterRules={competition.rosterRules} email={account.user.email} initialTeam={r.team_name ?? ""} initialClan={r.clan_name ?? ""} initialPlayers={[...r.registration_players].sort((a,b) => a.player_order - b.player_order).map((p) => ({ key: p.id, role:p.participant_role??null, fullName: p.display_name, ign: p.ign ?? "", gameId: p.game_player_id ?? "", phone: p.contact_phone ?? "" }))} /></>}
  </section>;
}
