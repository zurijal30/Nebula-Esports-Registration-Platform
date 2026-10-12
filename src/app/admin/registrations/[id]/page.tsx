import { notFound } from "next/navigation";
import { adminData } from "@/lib/admin/data";
import { PageIntro } from "@/components/ui/page-intro";
import { AdminUnavailable } from "@/components/admin/unavailable";
import { RegistrationForm } from "@/components/registrations/registration-form";
import { ConfirmationForm } from "@/components/admin/confirmation-form";
import { saveAdminRegistrationAction,cancelAdminRegistrationAction } from "@/lib/admin/actions";
import { formatDateTime } from "@/lib/tournament-format";
export const metadata={title:"Registration details"};
export default async function Entry({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{notice?:string}>}){
  const data=await adminData();if(data.error)return <AdminUnavailable/>;const {id}=await params;const r=data.registrations.find(r=>r.id===id);if(!r)notFound();
  const event=data.events.find(e=>e.event_games.some(c=>c.id===r.event_game_id));const competition=event?.event_games.find(c=>c.id===r.event_game_id);const owner=data.users.find(u=>u.id===r.captain_id);const query=await searchParams;
  const game=data.games.find(g=>g.id===competition?.game_id);
  const roster=[...r.registration_players].sort((a,b)=>a.player_order-b.player_order);
  return <section className="admin-editor"><PageIntro eyebrow={`${r.source==="admin"?"ADMIN-CREATED":"PLAYER-CREATED"} / ${r.status}`} title={r.team_name||roster[0]?.display_name||"Registration"}><p>{event?.title} · {data.games.find(g=>g.id===competition?.game_id)?.title} · submitted {formatDateTime(r.created_at)}</p></PageIntro>{query.notice==="saved"&&<p className="form-message form-success" role="status">Registration saved.</p>}
    <dl className="account-details"><div><dt>Owner</dt><dd>{owner?`${owner.display_name} · ${owner.email??"Email unavailable"}`:"Manual entry · managed by administrators"}</dd></div><div><dt>Registration ID</dt><dd>{r.id}</dd></div><div><dt>Clan</dt><dd>{r.clan_name??"None"}</dd></div></dl>
    {r.status==="cancelled"&&<p className="form-message">This entry is cancelled. You may correct its details; saving will keep it cancelled. Restoration is not available.</p>}
    <RegistrationForm admin manual={r.captain_id === null} saveAction={saveAdminRegistrationAction} registrationId={r.id} competitionId={r.event_game_id} type={r.registration_type} rosterRules={{maxTeamSize:game?.max_team_size,availableRoles:game?.available_roles}} email={owner?.email??""} initialTeam={r.team_name??""} initialClan={r.clan_name??""} initialPlayers={roster.map(p=>({key:p.id,role:p.participant_role??null,fullName:p.display_name,ign:p.ign??"",gameId:p.game_player_id??"",phone:p.contact_phone??""}))}/>
    {r.status==="active"&&<div className="registration-group"><ConfirmationForm action={cancelAdminRegistrationAction} hidden={{id:r.id}} label="Cancel registration" message="Cancel this entry? The record and roster will remain stored. It will be excluded from active participants. This cannot be restored through this interface."/></div>}
  </section>;
}
