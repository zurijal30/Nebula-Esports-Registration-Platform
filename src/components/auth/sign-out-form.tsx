"use client";

import { useActionState } from "react";
import { signOutAction } from "@/lib/auth/actions";
import { useFormStatus } from "react-dom";

function Button() {
  const { pending } = useFormStatus();
  return <button type="submit" className="action-link action-secondary" disabled={pending}>{pending ? "Signing out…" : "Sign Out"}</button>;
}
export function SignOutForm() {
  const [state, action] = useActionState(signOutAction, {});
  return <form action={action}><Button />{state.error && <p role="alert" className="form-message form-error">{state.error}</p>}</form>;
}
