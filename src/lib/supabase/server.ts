import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { supabasePublicEnv } from "./env";

export type StaffSessionCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

/**
 * The staff session client, for the operator zone only (OD-10 §1).
 * `pendingCookies` collects the writes for a Route Handler, which must put
 * them on its own response. Server Components cannot set cookies; the proxy
 * refreshes the session there.
 */
export async function createStaffServerClient(pendingCookies?: StaffSessionCookie[]) {
  const { url, publishableKey } = supabasePublicEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        pendingCookies?.push(...cookiesToSet);
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // A Server Component cannot set cookies; the proxy (T14) refreshes the session there.
        }
      },
    },
  });
}
