import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { requireAccount } from "@/lib/auth/account";

export const metadata: Metadata = { title: "Choose a new password" };
export default async function UpdatePassword() {
  await requireAccount("/update-password");
  return <AuthShell eyebrow="ACCOUNT SECURITY" title="A fresh start." description="Choose a new password for your Nebula account. Keep it unique to this account."><h2>Choose a new password</h2><AuthForm mode="update-password" enabled /></AuthShell>;
}
