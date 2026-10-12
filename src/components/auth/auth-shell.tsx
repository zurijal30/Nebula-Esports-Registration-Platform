import type { ReactNode } from "react";
import Link from "next/link";
import { Crosshair } from "lucide-react";

export function AuthShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return (
    <section className="container page-section auth-layout">
      <div className="auth-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p><div className="auth-brand-note"><Crosshair aria-hidden="true" /><span>YOUR ARENA. YOUR LEGACY.</span></div><Link href="/tournaments" className="text-link">Explore the tournament preview ↗</Link></div>
      <div className="auth-panel">{children}</div>
    </section>
  );
}

export function AuthConfigurationNotice({ enabled }: { enabled: boolean }) {
  return !enabled && <p role="status" className="form-message form-error">Account services are not configured yet. The administrator needs to complete Supabase and site URL setup.</p>;
}
