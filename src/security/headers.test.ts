vi.hoisted(() => { delete process.env.R2_PUBLIC_BASE_URL; });

import { describe, expect, it, vi } from "vitest";
import nextConfig, {
  contentSecurityPolicy,
  securityHeaders,
  staffContentSecurityPolicy,
  staffSecurityHeaders,
} from "../../next.config";

const section2ContentSecurityPolicy =
  "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'";

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

  it("adds an http or https bucket origin to img-src", () => {
    expect(contentSecurityPolicy("http://127.0.0.1:8333/devos-test/")).toBe(
      section2ContentSecurityPolicy.replace(
        "img-src 'self' data:",
        "img-src 'self' data: http://127.0.0.1:8333",
      ),
    );
    expect(contentSecurityPolicy("https://127.0.0.1:9443")).toBe(
      section2ContentSecurityPolicy.replace(
        "img-src 'self' data:",
        "img-src 'self' data: https://127.0.0.1:9443",
      ),
    );
  });

  it("leaves img-src unchanged when the base URL is missing or not http(s)", () => {
    expect(contentSecurityPolicy(undefined)).toBe(section2ContentSecurityPolicy);
    expect(contentSecurityPolicy("")).toBe(section2ContentSecurityPolicy);
    expect(contentSecurityPolicy("not a url")).toBe(section2ContentSecurityPolicy);
    expect(contentSecurityPolicy("ftp://127.0.0.1/devos-test")).toBe(
      section2ContentSecurityPolicy,
    );
  });

  it("reads the bucket origin into the baseline and the staff policy", async () => {
    vi.resetModules();
    vi.stubEnv("R2_PUBLIC_BASE_URL", "http://127.0.0.1:8333/devos-test");
    try {
      const loaded = await import("../../next.config");
      const baseline = loaded.securityHeaders.find(
        (entry) => entry.key === "Content-Security-Policy",
      )?.value;
      expect(baseline).toContain("img-src 'self' data: http://127.0.0.1:8333;");
      expect(loaded.staffContentSecurityPolicy).toContain(
        "img-src 'self' data: http://127.0.0.1:8333;",
      );
      const baselineDirectives = baseline?.split("; ") ?? [];
      const staffDirectives = loaded.staffContentSecurityPolicy.split("; ");
      expect(staffDirectives).toHaveLength(baselineDirectives.length);
      expect(loaded.staffContentSecurityPolicy).not.toBe(baseline);
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
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
