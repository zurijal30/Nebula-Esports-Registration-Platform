import { adminData } from "@/lib/admin/data";
import { getRequestNow } from "@/lib/server-time";
import { PageIntro } from "@/components/ui/page-intro";
import { AdminCatalogue } from "@/components/admin/catalogue";
import { AdminUnavailable } from "@/components/admin/unavailable";
export const metadata={title:"Manage users"};
export default async function Users(){const data=await adminData();return <section><PageIntro eyebrow="THE NEBULA COMMUNITY" title="Users."><p>View player accounts and manage trusted administrator access. You cannot change your own role.</p></PageIntro>{data.error?<AdminUnavailable/>:<AdminCatalogue kind="users" users={data.users} actorId={data.account.user.id} now={await getRequestNow()}/>}</section>;}
