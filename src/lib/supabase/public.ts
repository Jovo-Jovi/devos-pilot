import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabasePublicEnv } from "./env";

/** Anonymous reads for the public pages (OD-10 §6): publishable key, no session, no cookie. */
export function createPublicReadClient() {
  const { url, publishableKey } = supabasePublicEnv();
  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
