import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canAccessAdmin, safeAuthDestination, type AccountRole } from "./policy";

export interface Profile {
  id: string;
  display_name: string;
  contact_phone: string | null;
  role: AccountRole;
  created_at: string;
  updated_at: string;
}

export const getCurrentAccount = cache(async () => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { user: null, profile: null, profileError: false };
  try {
    // getUser validates against the Auth server, including revocation/deletion.
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { user: null, profile: null, profileError: false };
    const { data: profile, error: profileError } = await supabase.from("profiles")
      .select("id, display_name, contact_phone, role, created_at, updated_at")
      .eq("id", user.id).maybeSingle<Profile>();
    return { user, profile, profileError: Boolean(profileError || !profile) };
  } catch { return { user: null, profile: null, profileError: false }; }
});

export async function requireAccount(destination = "/dashboard") {
  const account = await getCurrentAccount();
  if (!account.user) redirect(`/sign-in?next=${encodeURIComponent(safeAuthDestination(destination))}&notice=required`);
  return account;
}

export async function requireAdmin() {
  const account = await requireAccount("/admin");
  if (!canAccessAdmin(account.user.id, account.profile)) redirect("/access-denied");
  return account;
}
