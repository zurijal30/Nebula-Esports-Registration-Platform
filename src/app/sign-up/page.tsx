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

export const metadata: Metadata = { title: "Create player account" };
export default async function SignUp({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeAuthDestination((await searchParams).next);
  if ((await getCurrentAccount()).user) redirect(next);
  const origin = getSiteOrigin();
  const configured = Boolean(getSupabaseConfig() && origin);
  return <AuthShell eyebrow="JOIN NEBULA" title="Make your next move." description="Create your player account. For team registrations, only the captain needs an account."><h2>Create player account</h2><p className="auth-panel-copy">Every new account starts as a player.</p><AuthConfigurationNotice enabled={configured} /><GoogleButton origin={origin} next={next} disabled={!configured} /><div className="auth-divider"><span>or sign up with email</span></div><AuthForm mode="sign-up" enabled={configured} next={next} /><p className="auth-switch">Already have an account? <Link href={`/sign-in?next=${encodeURIComponent(next)}`}>Sign In</Link></p></AuthShell>;
}
