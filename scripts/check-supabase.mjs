// Read-only setup diagnostic. Never print keys, cookies, users or tokens.
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../src/lib/auth/config.ts";

try { process.loadEnvFile(".env.local"); } catch { /* CI may supply env directly. */ }
const config = getSupabaseConfig();
if (!config) {
  console.log("Supabase public configuration is missing or invalid.");
  process.exitCode = 1;
} else {
  const response = await fetch(`${config.url}/auth/v1/settings`, { headers: { apikey: config.key }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    console.log(JSON.stringify({ authReachable: false, status: response.status }));
    process.exitCode = 1;
  } else {
    const settings = await response.json();
    console.log(JSON.stringify({ authReachable: true, emailEnabled: Boolean(settings.external?.email), googleEnabled: Boolean(settings.external?.google), emailConfirmationRequired: !settings.mailer_autoconfirm, signupDisabled: Boolean(settings.disable_signup) }));
    const supabase = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { error } = await supabase.from("events").select("id").limit(0);
    console.log(JSON.stringify({ publicEventsQueryReady: !error, errorCode: error?.code ?? null }));
  }
}
