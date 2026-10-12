import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell, AuthConfigurationNotice } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { GoogleButton } from "@/components/auth/google-button";
import { getSupabaseConfig } from "@/lib/auth/config";
import { getSiteOrigin } from "@/lib/auth/site-origin";
import { getCurrentAccount } from "@/lib/auth/account";
import { safeAuthDestination } from "@/lib/auth/policy";

export const metadata: Metadata = { title: "Sign In" };
export default async function SignIn({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const next = safeAuthDestination(query.next);
  const account = await getCurrentAccount();
  if (account.user) redirect(next);
  const configured = Boolean(getSupabaseConfig());
  const origin = getSiteOrigin();
  return (
    <AuthShell eyebrow="PLAYER ACCESS" title="Welcome back to the arena." description="Sign in to manage your profile and register for live competitions.">
      <h2>Sign In</h2><p className="auth-panel-copy">Your next chapter starts here.</p>
      <AuthConfigurationNotice enabled={configured && Boolean(origin)} />
      {query.notice === "required" && <p role="status" className="form-message">Please sign in to continue.</p>}
      {query.notice === "signed-out" && <p role="status" className="form-message form-success">You’ve been signed out of this browser.</p>}
      {(query.error === "callback" || query.error === "confirmation") && <p role="alert" className="form-message form-error">This sign-in or email link could not be verified. It may have expired. Try signing in again or request a new password reset link.</p>}
      <GoogleButton origin={origin} next={next} disabled={!configured} />
      <div className="auth-divider"><span>or continue with email</span></div>
      <AuthForm mode="sign-in" enabled={configured} next={next} />
      <p className="auth-switch">New to Nebula? <Link href={`/sign-up?next=${encodeURIComponent(next)}`}>Create a player account</Link></p>
    </AuthShell>
  );
}
