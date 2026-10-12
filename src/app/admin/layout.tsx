import { requireAdmin } from "@/lib/auth/account";
import Link from "next/link";
import { AdminNavigation } from "@/components/admin/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <div className="container page-section admin-shell"><div className="admin-masthead"><span className="eyebrow">NEBULA / ADMIN CONSOLE</span><Link className="back-link" href="/tournaments">Public website ↗</Link></div><AdminNavigation/><div className="admin-content">{children}</div></div>;
}
