import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, AuthConfigurationNotice } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { getSupabaseConfig } from "@/lib/auth/config";
import { getSiteOrigin } from "@/lib/auth/site-origin";

export const metadata: Metadata = { title: "Reset password" };
export default function ForgotPassword() {
  const configured = Boolean(getSupabaseConfig() && getSiteOrigin());
  return <AuthShell eyebrow="ACCOUNT RECOVERY" title="Get back in the game." description="Request a password reset email, then follow its secure link to choose a new password."><h2>Forgot your password?</h2><p className="auth-panel-copy">Enter the email address associated with your account.</p><AuthConfigurationNotice enabled={configured} /><AuthForm mode="forgot-password" enabled={configured} /><p className="auth-switch"><Link href="/sign-in">Back to Sign In</Link></p></AuthShell>;
}
