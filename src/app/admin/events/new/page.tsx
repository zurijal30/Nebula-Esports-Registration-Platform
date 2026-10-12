import { requireAdmin } from "@/lib/auth/account";
import { PageIntro } from "@/components/ui/page-intro";
import { EventEditor } from "@/components/admin/editors";
export const metadata={title:"Create event"};
export default async function NewEvent(){await requireAdmin();return <section className="admin-editor"><PageIntro eyebrow="BUILD THE NEXT ARENA" title="Create event."><p>Save a draft first, then add game competitions and an event banner. All dates use Asia/Colombo.</p></PageIntro><div className="dashboard-panel"><EventEditor/></div></section>;}
