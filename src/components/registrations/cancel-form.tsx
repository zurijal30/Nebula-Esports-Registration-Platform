"use client";
import { useActionState, useState } from "react";
import { cancelRegistrationAction } from "@/lib/registrations/actions";
import { SubmitButton } from "@/components/auth/submit-button";
export function CancelRegistrationForm({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(cancelRegistrationAction, {});
  if (!confirming) return <button type="button" className="cancel-link" onClick={() => setConfirming(true)}>Cancel registration</button>;
  return <form action={action} className="cancel-confirmation">
    <input type="hidden" name="registrationId" value={id} /><input type="hidden" name="confirm" value="yes" />
    <p>Cancel this registration? Your entry will be marked cancelled. You may register again while the window remains open.</p>
    {state.error && <p className="form-message form-error" role="alert">{state.error}</p>}
    <div className="registration-controls"><SubmitButton label="Confirm cancellation" pendingLabel="Cancelling…" /><button type="button" disabled={pending} className="cancel-link" onClick={() => setConfirming(false)}>Keep registration</button></div>
  </form>;
}
