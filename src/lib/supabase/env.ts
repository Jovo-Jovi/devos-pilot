export type SupabasePublicEnv = { url: string; publishableKey: string };

/** Pure check of the two public values (OD-10 §7). Throws a message naming the missing variable. */
export function checkSupabasePublicEnv(raw: {
  url: string | undefined;
  publishableKey: string | undefined;
}): SupabasePublicEnv {
  if (!raw.url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!raw.publishableKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set");
  }
  return { url: raw.url, publishableKey: raw.publishableKey };
}

export function supabasePublicEnv(): SupabasePublicEnv {
  return checkSupabasePublicEnv({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
