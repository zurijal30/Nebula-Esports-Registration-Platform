import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/auth/config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = getSupabaseConfig();
  if (!config) return response;
  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        for (const { name, value } of values) request.cookies.set(name, value);
        const previous = response;
        response = NextResponse.next({ request });
        for (const cookie of previous.cookies.getAll()) response.cookies.set(cookie);
        for (const key of ["Cache-Control", "Expires", "Pragma"]) {
          const value = previous.headers.get(key);
          if (value) response.headers.set(key, value);
        }
        for (const { name, value, options } of values) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });
  // Refresh verified tokens before rendering. Each protected page/action verifies
  // identity again and reads the role from the database, never user metadata.
  await supabase.auth.getClaims().catch(() => null);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"] };
