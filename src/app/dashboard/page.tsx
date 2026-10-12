import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/auth/account";
import { PageIntro } from "@/components/ui/page-intro";
import { ProfileForm } from "@/components/auth/profile-form";
import { SignOutForm } from "@/components/auth/sign-out-form";
import { formatDate } from "@/lib/tournament-format";

export const metadata: Metadata = { title: "Your account" };
export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user, profile, profileError } = await requireAccount();
  const query = await searchParams;
  return (
    <section className="container page-section">
      <PageIntro eyebrow="YOUR NEBULA ACCOUNT" title={profile ? `Welcome, ${profile.display_name}.` : "Your player account."}><p>Manage your profile and your competition journey.</p></PageIntro>
      {query.notice === "password-updated" && <p className="form-message form-success" role="status">Your password has been updated.</p>}
      <div className="dashboard-grid">
        <div className="dashboard-panel"><h2>Player profile</h2>{profileError || !profile ? <p className="form-message form-error">Your account is signed in, but its profile is unavailable. Ask the administrator to apply the database migration and check profile setup.</p> : <ProfileForm profile={profile} />}</div>
        <aside className="dashboard-panel"><span className="eyebrow">ACCOUNT DETAILS</span><dl className="account-details"><div><dt>Email</dt><dd>{user.email ?? "No email supplied"}</dd></div><div><dt>Role</dt><dd>{profile?.role ?? "Profile unavailable"}</dd></div>{profile && <div><dt>Member since</dt><dd>{formatDate(profile.created_at)}</dd></div>}</dl><p className="directory-help">Manage your solo and team entries before each competition’s registration deadline.</p><div className="account-links"><Link href="/dashboard/registrations">My Registrations ↗</Link><Link href="/tournaments">Explore tournaments ↗</Link><Link href="/update-password">Change password ↗</Link>{profile?.role === "admin" && <Link href="/admin">Admin dashboard ↗</Link>}</div><SignOutForm /></aside>
      </div>
    </section>
  );
}
