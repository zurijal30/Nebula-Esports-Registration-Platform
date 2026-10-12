import { adminData } from "@/lib/admin/data";
import { PageIntro } from "@/components/ui/page-intro";
import Image from "next/image";
import { GameEditor } from "@/components/admin/game-editor";
import { DeleteGame } from "@/components/admin/delete-game";
import { GameCleanup } from "@/components/admin/game-cleanup";
import { GAME_BANNER_FALLBACK } from "@/lib/game-image";
import { AdminUnavailable } from "@/components/admin/unavailable";
export const metadata={title:"Manage games"};
export default async function Games({searchParams}:{searchParams:Promise<{notice?:string}>}){
  const data=await adminData(),{notice}=await searchParams;
  return <section><PageIntro eyebrow="YOUR GAME CATALOGUE" title="Manage games."><p>Add games, set a reference type and manage their banners. Competition registration formats stay independent.</p></PageIntro>
    {notice?.startsWith("game-deleted")&&<p role="status" className="form-message form-success">Game permanently deleted.{notice==="game-deleted-cleanup"?" Some unused images could not be removed. Retry game-image cleanup below.":""}</p>}
    {data.error?<AdminUnavailable/>:<><section className="dashboard-panel admin-editor"><h2>Add game</h2><GameEditor/></section>
      <div className="admin-record-grid registration-group">{data.games.map(g=><article className="dashboard-panel" key={g.id}>
        <div className="admin-game-thumbnail"><Image fill unoptimized src={g.banner_url??GAME_BANNER_FALLBACK} alt={g.banner_alt??`${g.title} game banner`} sizes="(max-width:760px) 100vw, 400px"/></div>
        <h2>{g.title}</h2><p>{g.is_active?"Active":"Hidden"} · <span className="game-format-badge">{g.reference_type==="team"?"Team":g.reference_type==="solo"?"Solo":"Unspecified"}</span></p>
        {g.reference_type==="team"&&<p className="directory-help">Maximum individuals: {g.max_team_size??8}{g.max_team_size==null?" (default)":""} · {g.available_roles?.length??8} role slots</p>}
        <div className="admin-event-actions"><details className="game-edit-details"><summary className="action-link action-secondary">Edit Game</summary><GameEditor game={g} existingRosters={data.registrations.filter(r=>r.registration_type==="team"&&data.events.some(e=>e.event_games.some(c=>c.id===r.event_game_id&&c.game_id===g.id))).map(r=>({size:r.registration_players.length,roles:r.registration_players.map(p=>p.participant_role??null)}))}/></details><DeleteGame id={g.id} title={g.title} references={data.events.flatMap(e=>e.event_games).filter(c=>c.game_id===g.id).length}/></div>
      </article>)}</div>{!data.games.length&&<p className="directory-help">No supported games yet. Add your first title above.</p>}<GameCleanup/>
    </>}
  </section>;
}
