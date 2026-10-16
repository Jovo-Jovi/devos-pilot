import type { NextConfig } from "next";

/** SECURITY_MODEL §2. §2b adds the bucket origin to img-src when the argument is an http(s) URL. */
export function contentSecurityPolicy(r2PublicBaseUrl: string | undefined): string {
  const baseline =
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'";
  if (r2PublicBaseUrl) {
    try {
      const url = new URL(r2PublicBaseUrl);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return baseline.replace(
          "img-src 'self' data:",
          `img-src 'self' data: ${url.origin}`,
        );
      }
    } catch {
      // Unparsable: the §2 value is unchanged.
    }
  }
  return baseline;
}

export const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=86400" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy(process.env.R2_PUBLIC_BASE_URL),
  },
];

const baselineContentSecurityPolicy = securityHeaders.find(
  (entry) => entry.key === "Content-Security-Policy",
)?.value;

if (!baselineContentSecurityPolicy?.includes("form-action 'none'")) {
  throw new Error("baseline Content-Security-Policy is missing form-action 'none'");
}

/** Staff routes: the baseline CSP with form-action 'self' and every other directive unchanged. */
export const staffContentSecurityPolicy = baselineContentSecurityPolicy.replace(
  "form-action 'none'",
  "form-action 'self'",
);

export const staffSecurityHeaders = [
  { key: "Content-Security-Policy", value: staffContentSecurityPolicy },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    globalNotFound: true,
    serverActions: {
      bodySizeLimit: "7mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/ar",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/:locale/staff/:path*",
        headers: staffSecurityHeaders,
      },
    ];
  },
};

export default nextConfig;
