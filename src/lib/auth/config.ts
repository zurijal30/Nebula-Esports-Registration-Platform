export function parseSupabaseConfig(urlValue: string | undefined, keyValue: string | undefined) {
  const key = keyValue?.trim();
  if (!urlValue?.trim() || !key || key.startsWith("sb_secret_")) return null;
  try {
    const url = new URL(urlValue.trim());
    const local = ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.username || url.password || (url.protocol !== "https:" && !(local && url.protocol === "http:"))) return null;
    if (!key.startsWith("sb_publishable_")) {
      const encoded = (key.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
      const claims = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=")));
      if (claims.role !== "anon") return null;
    }
    return { url: url.toString().replace(/\/$/, ""), key };
  } catch { return null; }
}

export function getSupabaseConfig() {
  return parseSupabaseConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
