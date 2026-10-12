"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/lib/auth/actions";
import type { Profile } from "@/lib/auth/account";
import { SubmitButton } from "./submit-button";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateProfileAction, {});
  return (
    <form action={action} className="account-form">
      <div className="form-field"><label htmlFor="profile-display-name">Display name</label><input id="profile-display-name" name="display_name" autoComplete="nickname" minLength={2} maxLength={80} defaultValue={profile.display_name} required /></div>
      <div className="form-field"><label htmlFor="contact-phone">Contact phone <span>(optional)</span></label><input id="contact-phone" name="contact_phone" type="tel" autoComplete="tel" maxLength={30} defaultValue={profile.contact_phone ?? ""} aria-describedby="phone-help" /><p id="phone-help" className="field-help">Your contact details are private to you and authorised administrators.</p></div>
      {state.error && <p role="alert" className="form-message form-error">{state.error}</p>}
      {state.success && <p role="status" className="form-message form-success">{state.success}</p>}
      <SubmitButton label="Save profile" />
    </form>
  );
}
