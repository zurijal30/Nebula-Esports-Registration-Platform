"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, signUpAction, requestPasswordResetAction, updatePasswordAction } from "@/lib/auth/actions";
import { SubmitButton } from "./submit-button";

type Mode = "sign-in" | "sign-up" | "forgot-password" | "update-password";
const actions = { "sign-in": signInAction, "sign-up": signUpAction, "forgot-password": requestPasswordResetAction, "update-password": updatePasswordAction };
const labels = { "sign-in": "Sign In", "sign-up": "Create player account", "forgot-password": "Send reset link", "update-password": "Save new password" };

export function AuthForm({ mode, enabled, next = "/dashboard" }: { mode: Mode; enabled: boolean; next?: string }) {
  const [state, action] = useActionState(actions[mode], {});
  const hasPassword = mode !== "forgot-password";
  const newPassword = mode === "sign-up" || mode === "update-password";
  return (
    <form action={action} className="account-form">
      <input type="hidden" name="next" value={next} />
      {mode === "sign-up" && <div className="form-field"><label htmlFor="display-name">Display name</label><input id="display-name" name="display_name" autoComplete="nickname" minLength={2} maxLength={80} required disabled={!enabled} /></div>}
      {mode !== "update-password" && <div className="form-field"><label htmlFor="email">Email address</label><input id="email" type="email" name="email" autoComplete="email" maxLength={254} required disabled={!enabled} /></div>}
      {hasPassword && <div className="form-field"><label htmlFor="password">{newPassword ? "New password" : "Password"}</label><input id="password" type="password" name="password" autoComplete={newPassword ? "new-password" : "current-password"} minLength={newPassword ? 10 : undefined} maxLength={128} required disabled={!enabled} aria-describedby={newPassword ? "password-help" : undefined} />{newPassword && <p id="password-help" className="field-help">Use at least 10 characters. Your project may require a stronger password.</p>}</div>}
      {newPassword && <div className="form-field"><label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" type="password" name="confirm_password" autoComplete="new-password" minLength={10} maxLength={128} required disabled={!enabled} /></div>}
      {mode === "sign-in" && <Link className="form-link recovery-link" href="/forgot-password">Forgot your password?</Link>}
      {state.error && <p role="alert" className="form-message form-error">{state.error}</p>}
      {state.success && <p role="status" className="form-message form-success">{state.success}</p>}
      <SubmitButton label={labels[mode]} disabled={!enabled} />
    </form>
  );
}
