"use client";

import { useFormStatus } from "react-dom";
import { ArrowUpRight } from "lucide-react";

export function SubmitButton({ label, pendingLabel = "Please wait…", disabled = false }: { label: string; pendingLabel?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="action-link action-primary auth-submit" disabled={disabled || pending}>{pending ? pendingLabel : label}<ArrowUpRight size={18} aria-hidden="true" /></button>;
}
