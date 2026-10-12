export function parseSiteOrigin(value: string | undefined, production: boolean) {
  const configured = value?.trim() || (production ? "" : "http://localhost:3000");
  if (!configured) return null;
  try {
    const url = new URL(configured);
    const local = ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
    return url.origin;
  } catch { return null; }
}

/** A configured canonical origin; never derive email/OAuth redirects from Host headers. */
export function getSiteOrigin() {
  return parseSiteOrigin(process.env.SITE_URL, process.env.NODE_ENV === "production");
}
