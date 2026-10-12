import Link from "next/link";
import { adminData } from "@/lib/admin/data";
import { getRequestNow } from "@/lib/server-time";
import { PageIntro } from "@/components/ui/page-intro";
import { AdminCatalogue } from "@/components/admin/catalogue";
import { AdminUnavailable } from "@/components/admin/unavailable";
import { BannerCleanup } from "@/components/admin/banner-cleanup";
export const metadata={title:"Manage events"};
export default async function Events({searchParams}:{searchParams:Promise<{notice?:string}>}){const data=await adminData();const {notice}=await searchParams;return <section><PageIntro eyebrow="THE NEBULA SCHEDULE" title="Manage events."><p>Create drafts, publish competitions and keep your event details current.</p></PageIntro>{(notice==="deleted"||notice==="deleted-cleanup")&&<p className={`form-message ${notice==="deleted"?"form-success":"form-error"}`} role="status">{notice==="deleted"?"Event and its registrations permanently deleted. Banner cleanup completed.":"Event and its registrations permanently deleted. Some banner files could not be cleaned up; retry unused-image cleanup below."}</p>}<div className="admin-top-actions"><Link className="action-link" href="/admin/events/new">Create event ↗</Link><BannerCleanup/></div>{data.error?<AdminUnavailable/>:<AdminCatalogue kind="events" events={data.events} registrations={data.registrations} now={await getRequestNow()}/>}</section>;}
