import { randomUUID } from "node:crypto";
import { adminData } from "@/lib/admin/data";
import { PageIntro } from "@/components/ui/page-intro";
import { AdminUnavailable } from "@/components/admin/unavailable";
import { RegistrationForm } from "@/components/registrations/registration-form";
import { saveAdminRegistrationAction } from "@/lib/admin/actions";
export const metadata={title:"Add manual registration"};
export default async function NewRegistration({searchParams}:{searchParams:Promise<{competition?:string}>}){
  const data=await adminData();if(data.error)return <AdminUnavailable/>;const query=await searchParams;
  const event=data.events.find(e=>e.event_games.some(c=>c.id===query.competition));const competition=event?.event_games.find(c=>c.id===query.competition);
  return <section className="admin-editor"><PageIntro eyebrow="ADMIN-CREATED ENTRY" title="Add registration."><p>No Auth account is created. Nebula administrators manage this manual entry. Deadline overrides are permitted.</p></PageIntro>
    <form className="admin-filters" action="/admin/registrations/new"><label>Game competition<select name="competition" required defaultValue={query.competition??""}><option value="">Choose competition</option>{data.events.flatMap(e=>e.event_games.map(c=><option key={c.id} value={c.id}>{e.title} · {data.games.find(g=>g.id===c.game_id)?.title} · {c.registration_type}</option>))}</select></label><button className="action-link" type="submit">Select competition ↗</button></form>
    {competition?<><h2>{event?.title} · {data.games.find(g=>g.id===competition.game_id)?.title}</h2><RegistrationForm key={competition.id} admin manual saveAction={saveAdminRegistrationAction} competitionId={competition.id} type={competition.registration_type} rosterRules={{maxTeamSize:data.games.find(g=>g.id===competition.game_id)?.max_team_size,availableRoles:data.games.find(g=>g.id===competition.game_id)?.available_roles}} requestId={randomUUID()} email="" initialPlayers={[{key:"captain",fullName:"",ign:"",gameId:"",phone:""}]}/></>:<p className="directory-help">Select a competition to enter participant details.</p>}
  </section>;
}
