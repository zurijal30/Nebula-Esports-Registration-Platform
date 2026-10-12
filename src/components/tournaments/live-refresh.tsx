"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/auth/config";
export function LiveEventRefresh() {
  const router = useRouter();
  const path = usePathname();
  const enabled = path === "/" || path.startsWith("/tournaments");
  useEffect(() => {
    if (!enabled || !getSupabaseConfig()) return;
    const client = createBrowserSupabaseClient();
    let version: number | undefined;
    let disposed = false;
    let checking = false;
    let queued = false;
    let forceRefresh = false;
    let connected = false;
    // Coalesce focus, polling and realtime checks; never refresh unchanged data.
    const check = async (force = false) => {
      forceRefresh ||= force;
      if (checking) { queued = true; return; }
      checking = true;
      try {
        do {
          queued = false;
          const { data } = await client.from("event_public_refresh").select("version").eq("id", true).maybeSingle();
          if (disposed) return;
          if (forceRefresh || (data && version !== undefined && version !== data.version)) router.refresh();
          forceRefresh = false;
          if (data) version = data.version;
        } while (queued && !disposed);
      } catch {
        // A trusted realtime update still invalidates the route if its probe fails.
        if (!disposed && forceRefresh) router.refresh();
        forceRefresh = false;
      } finally { checking = false; }
    };
    const channel = client.channel("nebula-public-event-refresh")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "event_public_refresh" }, () => { void check(true); })
      .subscribe(status => {
        if (status === "SUBSCRIBED") {
          // One initial reconciliation catches edits made between SSR and subscription.
          // Subsequent reconnects only refresh when the version has changed.
          void check(!connected);
          connected = true;
        }
      });
    void check();
    const interval = setInterval(() => { if (document.visibilityState === "visible") void check(); }, 15000);
    const focus = () => { void check(); };
    window.addEventListener("focus", focus);
    return () => {
      disposed = true;
      clearInterval(interval);
      window.removeEventListener("focus", focus);
      void client.removeChannel(channel);
    };
  }, [router, enabled]);
  return null;
}
