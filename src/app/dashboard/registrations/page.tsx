import Link from "next/link";
import { requireAccount } from "@/lib/auth/account";
import { getMyRegistrations } from "@/lib/registrations/data";
import { getLiveEvents } from "@/lib/tournaments/live";
import { getCompetitionStatus } from "@/lib/tournament-status";
import { getRequestNow } from "@/lib/server-time";
import { formatDateTime } from "@/lib/tournament-format";
import { PageIntro } from "@/components/ui/page-intro";
import { CancelRegistrationForm } from "@/components/registrations/cancel-form";
import { effectiveRosterRules,roleLabel } from "@/lib/registrations/roster-rules";
export const metadata = { title: "My Registrations" };
export default async function MyRegistrations({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const account = await requireAccount("/dashboard/registrations");
  const [{ registrations, error }, events, query, now] = await Promise.all([getMyRegistrations(account.user.id), getLiveEvents(), searchParams, getRequestNow()]);
  const notices: Record<string, string> = { created: "Registration submitted successfully. Your place is recorded below.", updated: "Your registration has been updated.", cancelled: "Your registration has been cancelled." };
  return <section className="container page-section">
    <Link className="back-link" href="/dashboard">← Your account</Link><PageIntro eyebrow="YOUR COMPETITION JOURNEY" title="My Registrations."><p>Your solo and team entries, all in one place. Changes close at each game’s deadline.</p></PageIntro>
    {query.notice && notices[query.notice] && <p role="status" className="form-message form-success">{notices[query.notice]}</p>}
    {error ? <p className="form-message form-error">Registrations could not be loaded. Please try again or ask the organiser to check database setup.</p> : <>
      {events.error && <p className="form-message form-error">Schedules are temporarily unavailable. Editing and cancellation are paused until they can be verified.</p>}
      {!registrations.length && <div className="empty-state"><h2>Your arena awaits.</h2><p>You haven’t registered for a live competition yet.</p><Link className="action-link" href="/tournaments">Explore tournaments ↗</Link></div>}
      {(["active", "cancelled"] as const).map((status) => { const group = registrations.filter((r) => r.status === status); return group.length > 0 && <section key={status} className="registration-group"><h2>{status === "active" ? "Active registrations" : "Cancelled registrations"} <span className="accent">({group.length})</span></h2><div className="registration-cards">
        {group.map((r) => {
          const tournament = events.tournaments.find((e) => e.competitions.some((c) => c.id === r.event_game_id));
          const competition = tournament?.competitions.find((c) => c.id === r.event_game_id);
          const manageable = status === "active" && tournament && competition && getCompetitionStatus(tournament, competition, now) === "open";
          const editable = manageable && competition.registrationType === r.registration_type;
          return <article className={`registration-card ${status}`} key={r.id} id={`registration-${r.id}`}><span className="eyebrow">{status} / {r.registration_type}</span><h3>{tournament?.title ?? "Event currently unavailable"}</h3><p className="accent">{competition?.gameTitle ?? "Competition unavailable"}{r.team_name && ` · ${r.team_name}`}</p>
            {r.clan_name&&<p>Clan: {r.clan_name}</p>}{r.registration_type==="team"&&competition&&<p className="directory-help">Roster: {r.registration_players.length} / {effectiveRosterRules(competition.rosterRules).max} maximum individuals</p>}
            <dl className="competition-facts"><div><dt>Submitted</dt><dd>{formatDateTime(r.created_at)}</dd></div>{tournament && <div><dt>Event schedule</dt><dd>{formatDateTime(tournament.startsAt)} — {formatDateTime(tournament.endsAt)}</dd></div>}{competition && <><div><dt>Competition starts</dt><dd>{formatDateTime(competition.startsAt)}</dd></div><div><dt>Registration deadline</dt><dd>{formatDateTime(competition.registrationClosesAt)}</dd></div></>}</dl>
            <details><summary>View roster · {r.registration_players.length} {r.registration_players.length === 1 ? "individual" : "individuals"}</summary><ol className="roster-summary">{[...r.registration_players].sort((a, b) => a.player_order - b.player_order).map((p) => <li key={p.id}><strong>{p.display_name}{p.is_captain && r.registration_type === "team" && " · Captain"}</strong>{r.registration_type==="team"&&<span>{roleLabel(p.participant_role)}</span>}<span>{p.ign || "IGN not recorded"} · {p.game_player_id} · {p.contact_phone}</span></li>)}</ol></details>
            {manageable ? <div className="registration-controls">{editable ? <Link className="action-link action-secondary" href={`/dashboard/registrations/${r.id}/edit`}>Edit registration ↗</Link> : <p className="directory-help">The competition format has changed. Contact the organiser before editing.</p>}<CancelRegistrationForm id={r.id} /></div> : status === "active" && <p className="directory-help">Editing and cancellation are unavailable while the competition is closed, cancelled or unavailable.</p>}
            {tournament && <Link className="back-link" href={`/tournaments/live/${tournament.slug}`}>View event ↗</Link>}
          </article>;
        })}</div></section>; })}
    </>}
  </section>;
}
