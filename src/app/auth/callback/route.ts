import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeAuthDestination } from "@/lib/auth/policy";
import { getSiteOrigin } from "@/lib/auth/site-origin";

export async function GET(request: NextRequest) {
  const origin = getSiteOrigin();
  if (!origin) return new NextResponse("Authentication origin is not configured.", { status: 503, headers: { "Cache-Control": "no-store" } });
  const responseHeaders = new Headers({ "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" });
  const supabase = await createServerSupabaseClient({ writable: true, responseHeaders });
  const code = request.nextUrl.searchParams.get("code");
  let destination = "/sign-in?error=callback";
  if (supabase && code && !request.nextUrl.searchParams.has("error")) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) destination = safeAuthDestination(request.nextUrl.searchParams.get("next"));
    } catch { /* Strip failed callback credentials from the destination. */ }
  }
  return NextResponse.redirect(new URL(destination, origin), { headers: responseHeaders });
}
