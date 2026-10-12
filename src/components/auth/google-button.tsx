"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/auth/config";
import { safeAuthDestination } from "@/lib/auth/policy";

export function GoogleButton({ origin, next = "/dashboard", disabled }: { origin: string | null; next?: string; disabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function continueWithGoogle() {
    if (!origin) return;
    setPending(true);
    setError("");
    try {
      const config = getSupabaseConfig();
      if (!config) throw new Error("Missing configuration");
      // A disabled provider should produce a friendly local error, not a raw
      // Supabase error page after leaving this site.
      const response = await fetch(`${config.url}/auth/v1/settings`, { headers: { apikey: config.key } });
      if (!response.ok) throw new Error("Provider settings unavailable");
      const settings = await response.json();
      if (!settings.external?.google) {
        setError("Google sign-in is not enabled yet. Please use email sign-in or contact the administrator.");
        setPending(false);
        return;
      }
      const supabase = createBrowserSupabaseClient();
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeAuthDestination(next))}`, skipBrowserRedirect: true },
      });
      if (oauthError || !data.url) throw new Error("OAuth could not start");
      window.location.assign(data.url);
    } catch {
      setError("Google sign-in could not be started. Please try again shortly.");
      setPending(false);
    }
  }
  return <div><button type="button" className="google-button" onClick={continueWithGoogle} disabled={disabled || !origin || pending}><span className="google-mark" aria-hidden="true">G</span>{pending ? "Connecting to Google…" : "Continue with Google"}</button>{error && <p role="alert" className="form-message form-error">{error}</p>}</div>;
}
