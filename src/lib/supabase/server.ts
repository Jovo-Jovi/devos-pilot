import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { supabasePublicEnv } from "./env";

/** The staff session client, for the operator zone only (OD-10 §1): reads and refreshes the session cookies. */
export async function createStaffServerClient() {
  const { url, publishableKey } = supabasePublicEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
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
