"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/auth/config";

export function createBrowserSupabaseClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase public configuration is missing or invalid.");
  return createBrowserClient(config.url, config.key);
}
