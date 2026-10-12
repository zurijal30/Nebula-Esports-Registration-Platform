import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "@/lib/auth/config";

export async function createServerSupabaseClient(options: { writable?: boolean; responseHeaders?: Headers } = {}) {
  const config = getSupabaseConfig();
  if (!config) return null;
  const store = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values, headers) {
        try {
          for (const { name, value, options: cookieOptions } of values) store.set(name, value, cookieOptions);
        } catch (error) {
          // Server Components are read-only; Proxy handles session refresh there.
          // Actions and callback handlers must not silently lose cookie writes.
          if (options.writable) throw error;
        }
        for (const [key, value] of Object.entries(headers)) options.responseHeaders?.set(key, value);
      },
    },
  });
}
