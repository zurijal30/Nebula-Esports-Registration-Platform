"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { authErrorMessage, safeAuthDestination, validateEmail, validatePassword, validateProfile } from "./policy";
import { getSiteOrigin } from "./site-origin";

export interface AuthFormState { error?: string; success?: string }
const unavailable = { error: "Account services are not configured. Please contact the site administrator." };
const text = (form: FormData, key: string) => typeof form.get(key) === "string" ? String(form.get(key)) : "";

export async function signInAction(_previous: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = text(form, "email").trim();
  const password = text(form, "password");
  if (!validateEmail(email) || !password || password.length > 128) return { error: "Enter your email and password." };
  const supabase = await createServerSupabaseClient({ writable: true });
  if (!supabase) return unavailable;
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: authErrorMessage(error.code) };
  } catch { return { error: authErrorMessage() }; }
  revalidatePath("/", "layout");
  redirect(safeAuthDestination(text(form, "next")));
}

export async function signUpAction(_previous: AuthFormState, form: FormData): Promise<AuthFormState> {
  const next = safeAuthDestination(text(form, "next"));
  const email = text(form, "email").trim();
  const displayName = text(form, "display_name").trim();
  const password = text(form, "password");
  const validation = validateProfile(displayName, "") || validatePassword(password, text(form, "confirm_password"));
  if (validation) return { error: validation };
  if (!validateEmail(email)) return { error: "Enter a valid email address." };
  const origin = getSiteOrigin();
  const supabase = await createServerSupabaseClient({ writable: true });
  if (!supabase || !origin) return unavailable;
  let signedIn = false;
  try {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: displayName }, emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) return { error: authErrorMessage(error.code) };
    signedIn = Boolean(data.session);
  } catch { return { error: authErrorMessage() }; }
  if (signedIn) { revalidatePath("/", "layout"); redirect(next); }
  return { success: "Check your email for an account confirmation link. If this address already has an account, you can sign in or reset your password." };
}

export async function requestPasswordResetAction(_previous: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = text(form, "email").trim();
  if (!validateEmail(email)) return { error: "Enter a valid email address." };
  const origin = getSiteOrigin();
  const supabase = await createServerSupabaseClient({ writable: true });
  if (!supabase || !origin) return unavailable;
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/update-password` });
    if (error) return { error: authErrorMessage(error.code) };
  } catch { return { error: authErrorMessage() }; }
  return { success: "If an account exists for this email address, a password reset link has been sent. Check your inbox." };
}

export async function updatePasswordAction(_previous: AuthFormState, form: FormData): Promise<AuthFormState> {
  const password = text(form, "password");
  const validation = validatePassword(password, text(form, "confirm_password"));
  if (validation) return { error: validation };
  const supabase = await createServerSupabaseClient({ writable: true });
  if (!supabase) return unavailable;
  try {
    const { data: { user }, error: identityError } = await supabase.auth.getUser();
    if (identityError || !user) return { error: "Your reset session has expired. Request a new password reset link." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: authErrorMessage(error.code) };
  } catch { return { error: authErrorMessage() }; }
  revalidatePath("/", "layout");
  redirect("/dashboard?notice=password-updated");
}

export async function updateProfileAction(_previous: AuthFormState, form: FormData): Promise<AuthFormState> {
  const displayName = text(form, "display_name").trim();
  const contactPhone = text(form, "contact_phone").trim();
  const validation = validateProfile(displayName, contactPhone);
  if (validation) return { error: validation };
  const supabase = await createServerSupabaseClient({ writable: true });
  if (!supabase) return unavailable;
  try {
    const { data: { user }, error: identityError } = await supabase.auth.getUser();
    if (identityError || !user) return { error: "Please sign in again before updating your profile." };
    // Explicit fields and verified ownership; form data cannot choose ID or role.
    const { data, error } = await supabase.from("profiles")
      .update({ display_name: displayName, contact_phone: contactPhone || null })
      .eq("id", user.id).select("id").maybeSingle();
    if (error || !data) return { error: "Your profile could not be saved. Ask the administrator to check database setup, then try again." };
  } catch { return { error: authErrorMessage() }; }
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  return { success: "Your profile has been updated." };
}

export async function signOutAction(): Promise<AuthFormState> {
  const supabase = await createServerSupabaseClient({ writable: true });
  if (!supabase) return unavailable;
  try {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return { error: "Unable to sign out. Please try again." };
  } catch { return { error: authErrorMessage() }; }
  revalidatePath("/", "layout");
  redirect("/sign-in?notice=signed-out");
}
