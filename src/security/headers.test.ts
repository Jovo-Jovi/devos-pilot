import { describe, expect, it } from "vitest";
import nextConfig, { securityHeaders } from "../../next.config";

describe("security header baseline", () => {
  it("lists exactly the six header names", () => {
    expect(securityHeaders.map((entry) => entry.key)).toEqual([
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "X-Frame-Options",
      "Content-Security-Policy",
    ]);
  });

  it("equals each mandated value", () => {
    expect(securityHeaders).toEqual([
      { key: "Strict-Transport-Security", value: "max-age=86400" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      { key: "X-Frame-Options", value: "DENY" },
      {
        key: "Content-Security-Policy",
        value:
          "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'",
      },
    ]);
  });

  it("applies those headers to /:path*", async () => {
    if (!nextConfig.headers) {
      throw new Error("headers() is missing");
    }
    const entries = await nextConfig.headers();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.source).toBe("/:path*");
    expect(entries[0]?.headers).toBe(securityHeaders);
  });

  it("omits includeSubDomains from Strict-Transport-Security", () => {
    const strictTransportSecurity = securityHeaders.find(
      (entry) => entry.key === "Strict-Transport-Security",
    );
    expect(strictTransportSecurity?.value.includes("includeSubDomains")).toBe(
      false,
    );
  });

  it("sets frame-ancestors and form-action to none", () => {
    const contentSecurityPolicy = securityHeaders.find(
      (entry) => entry.key === "Content-Security-Policy",
    );
    expect(contentSecurityPolicy?.value).toContain("frame-ancestors 'none'");
    expect(contentSecurityPolicy?.value).toContain("form-action 'none'");
  });
});
