import Link from "next/link";
import { adminData } from "@/lib/admin/data";
import { getRequestNow } from "@/lib/server-time";
import { PageIntro } from "@/components/ui/page-intro";
import { AdminCatalogue } from "@/components/admin/catalogue";
import { AdminUnavailable } from "@/components/admin/unavailable";
export const metadata={title:"Manage registrations"};
export default async function Registrations({searchParams}:{searchParams:Promise<{event?:string}>}){const data=await adminData();const query=await searchParams;return <section><PageIntro eyebrow="THE PARTICIPANT DESK" title="Registrations."><p>View every entry, manage rosters and add participants without creating accounts.</p></PageIntro><div className="admin-top-actions"><Link className="action-link" href="/admin/registrations/new">Add manual registration ↗</Link></div>{data.error?<AdminUnavailable/>:<AdminCatalogue kind="registrations" events={data.events} games={data.games} users={data.users} registrations={data.registrations} initialEvent={data.events.some(e=>e.id===query.event)?query.event:"all"} now={await getRequestNow()}/>}</section>;}
