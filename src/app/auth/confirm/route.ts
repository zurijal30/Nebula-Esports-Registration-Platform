import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/auth/site-origin";
import { safeAuthDestination } from "@/lib/auth/policy";

export async function GET(request: NextRequest) {
  const origin = getSiteOrigin();
  if (!origin) return new NextResponse("Authentication origin is not configured.", { status: 503, headers: { "Cache-Control": "no-store" } });
  const responseHeaders = new Headers({ "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" });
  const supabase = await createServerSupabaseClient({ writable: true, responseHeaders });
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  let destination = "/sign-in?error=confirmation";
  // Email verification cannot redirect to arbitrary paths or change OTP type.
  if (supabase && tokenHash && (type === "signup" || type === "recovery")) {
    try {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (!error) {
        let next = safeAuthDestination(request.nextUrl.searchParams.get("next"));
        try {
          const returnUrl = new URL(request.nextUrl.searchParams.get("redirect_to") ?? "");
          if (returnUrl.origin === origin && returnUrl.pathname === "/auth/callback") next = safeAuthDestination(returnUrl.searchParams.get("next"));
        } catch { /* A malformed URL never becomes a redirect target. */ }
        destination = type === "recovery" ? "/update-password" : next;
      }
    } catch { /* Expired/invalid tokens get the same friendly message. */ }
  }
  return NextResponse.redirect(new URL(destination, origin), { headers: responseHeaders });
}
