import Link from "next/link";
import { requireAdmin } from "@/lib/auth/account";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PageIntro } from "@/components/ui/page-intro";
import { AdminUnavailable } from "@/components/admin/unavailable";
export const metadata={title:"Admin dashboard"};
export default async function AdminDashboard(){
  await requireAdmin();const client=await createServerSupabaseClient();const result=client?await client.rpc("admin_overview"):{data:null,error:true};
  const stats=result.data as Record<string,number>|null;
  return <section><PageIntro eyebrow="YOUR OPERATIONS OVERVIEW" title="The organiser’s arena."><p>Real event, participant and account totals from your Nebula database.</p></PageIntro>{result.error||!stats?<AdminUnavailable/>:<div className="admin-stat-grid">{[{key:"events",label:"Total events"},{key:"published",label:"Published events"},{key:"upcoming",label:"Upcoming events"},{key:"active",label:"Active registrations"},{key:"cancelled",label:"Cancelled registrations"},{key:"players",label:"Player accounts"}].map(s=><article className="admin-stat" key={s.key}><span>{s.label}</span><strong>{stats[s.key]}</strong></article>)}</div>}
    <div className="admin-record-grid registration-group"><article className="dashboard-panel"><h2>Build the next arena.</h2><p>Create an event draft, set each game’s registration window and publish when ready.</p><Link className="action-link" href="/admin/events/new">Create event ↗</Link></article><article className="dashboard-panel"><h2>Manage participants.</h2><p>Review entries, correct rosters or register participants without an account.</p><Link className="action-link action-secondary" href="/admin/registrations">Open registrations ↗</Link></article></div>
  </section>;
}
