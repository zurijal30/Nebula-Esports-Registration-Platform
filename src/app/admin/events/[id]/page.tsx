import Link from "next/link";
import { notFound } from "next/navigation";
import { adminData } from "@/lib/admin/data";
import { PageIntro } from "@/components/ui/page-intro";
import { EventEditor,CompetitionEditor } from "@/components/admin/editors";
import { BannerForm } from "@/components/admin/banner-form";
import { ExportButton } from "@/components/admin/export-button";
import { AdminUnavailable } from "@/components/admin/unavailable";
import { formatDateTime } from "@/lib/tournament-format";
export const metadata={title:"Manage event"};
export default async function EventPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{notice?:string}>}){
  const data=await adminData();const {id}=await params;const event=data.events.find(e=>e.id===id);if(data.error)return <AdminUnavailable/>;if(!event)notFound();const query=await searchParams;
  return <section><PageIntro eyebrow="EVENT MANAGEMENT" title={event.title}><p>{event.is_published?"Published":"Unpublished draft"} · {event.status} · {formatDateTime(event.starts_at)}</p></PageIntro>{query.notice==="saved"&&<p className="form-message form-success" role="status">Event saved. Existing registrations are preserved.</p>}
  <div className="admin-top-actions"><Link className="action-link action-secondary" href={`/tournaments/live/${event.slug}`}>{event.is_published?"View public event":"Public URL · unavailable until published"} ↗</Link><Link className="back-link" href={`/admin/registrations?event=${event.id}`}>View registrations ↗</Link></div>
  <div className="admin-editor-grid"><div className="dashboard-panel"><h2>Event details</h2><EventEditor event={event}/></div><div className="dashboard-panel"><h2>Event banner</h2><BannerForm eventId={event.id} current={event.banner_url} alt={event.banner_alt??event.title}/></div></div>
  <section className="registration-group"><h2>Game competitions <span className="accent">({event.event_games.length})</span></h2><ExportButton eventId={event.id}/>{!event.event_games.length&&<p className="directory-help">No competitions yet. Add the first game below.</p>}<div className="admin-record-grid">{event.event_games.map(c=><details key={c.id} className="dashboard-panel admin-competition"><summary>{data.games.find(g=>g.id===c.game_id)?.title} · {c.registration_type} · {c.status}</summary><p className="directory-help">{data.registrations.filter(r=>r.event_game_id===c.id&&r.status==="active").length} active entries · opens {formatDateTime(c.registration_opens_at)}</p><ExportButton eventId={event.id} competitionId={c.id}/>{!data.registrations.some(r=>r.event_game_id===c.id&&r.status==="active")&&<p className="directory-help">No active registrations. The export contains headers and an empty-state message.</p>}<CompetitionEditor event={event} games={data.games} competition={c} hasRegistrations={data.registrations.some(r=>r.event_game_id===c.id)}/><Link className="back-link" href={`/admin/registrations/new?competition=${c.id}`}>Add manual registration ↗</Link></details>)}</div></section>
  <section className="registration-group admin-editor"><h2>Add a competition</h2><div className="dashboard-panel"><CompetitionEditor event={event} games={data.games}/></div></section>
  </section>;
}
