import { describe, expect, it } from "vitest";
import { checkSupabasePublicEnv } from "./env";

describe("checkSupabasePublicEnv", () => {
  it("returns both values when both are set", () => {
    expect(
      checkSupabasePublicEnv({ url: "http://127.0.0.1:54321", publishableKey: "test-publishable-key" }),
    ).toEqual({ url: "http://127.0.0.1:54321", publishableKey: "test-publishable-key" });
  });

  it("names the missing URL", () => {
    expect(() =>
      checkSupabasePublicEnv({ url: undefined, publishableKey: "test-publishable-key" }),
    ).toThrow("NEXT_PUBLIC_SUPABASE_URL is not set");
  });

  it("names the missing publishable key", () => {
    expect(() =>
      checkSupabasePublicEnv({ url: "http://127.0.0.1:54321", publishableKey: "" }),
    ).toThrow("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set");
  });
});
