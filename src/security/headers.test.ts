import { describe, expect, it } from "vitest";
import nextConfig, {
  securityHeaders,
  staffContentSecurityPolicy,
  staffSecurityHeaders,
} from "../../next.config";

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

  it("applies those headers to /:path* and the staff CSP after it", async () => {
    if (!nextConfig.headers) {
      throw new Error("headers() is missing");
    }
    const entries = await nextConfig.headers();
    expect(entries).toHaveLength(2);
    expect(entries[0]?.source).toBe("/:path*");
    expect(entries[0]?.headers).toBe(securityHeaders);
    expect(entries[1]?.source).toBe("/:locale/staff/:path*");
    expect(entries[1]?.headers).toEqual(staffSecurityHeaders);
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

  it("keeps form-action none on the public entry", async () => {
    if (!nextConfig.headers) {
      throw new Error("headers() is missing");
    }
    const entries = await nextConfig.headers();
    const publicCsp = entries[0]?.headers?.find(
      (entry) => entry.key === "Content-Security-Policy",
    );
    expect(publicCsp?.value).toContain("form-action 'none'");
    expect(publicCsp?.value).not.toContain("form-action 'self'");
  });

  it("differs from the baseline only in form-action", () => {
    const baseline = securityHeaders.find(
      (entry) => entry.key === "Content-Security-Policy",
    )?.value;
    expect(baseline).toBeTruthy();
    expect(staffContentSecurityPolicy).not.toBe(baseline);
    const baselineDirectives = baseline?.split("; ") ?? [];
    const staffDirectives = staffContentSecurityPolicy.split("; ");
    expect(staffDirectives).toHaveLength(baselineDirectives.length);
    expect(staffSecurityHeaders).toEqual([
      { key: "Content-Security-Policy", value: staffContentSecurityPolicy },
    ]);
    for (let index = 0; index < baselineDirectives.length; index += 1) {
      const base = baselineDirectives[index];
      const staff = staffDirectives[index];
      if (base?.startsWith("form-action")) {
        expect(base).toBe("form-action 'none'");
        expect(staff).toBe("form-action 'self'");
      } else {
        expect(staff).toBe(base);
      }
    }
  });
});
