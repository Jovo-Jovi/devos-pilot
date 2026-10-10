// guard:boundary — nothing accepts, stores or sends visitor data (BOUNDARY_MODEL §2, non-waivable).
import { hasSrc, srcFiles, walk, scan, result } from "./lib.mjs";

const SRC_RULES = [
  { re: /<(form|input|textarea|select)\b/i, label: "form control" },
  { re: /\bdocument\.cookie\b|\bcookies\(\)/, label: "cookie access" },
  { re: /\b(localStorage|sessionStorage|indexedDB)\b/, label: "browser storage" },
  { re: /\bsendBeacon\b/, label: "beacon" },
  { re: /posthog|@sentry\/|gtag\(|googletagmanager|google-analytics|plausible|mixpanel|segment\.com/i, label: "analytics / tracker" },
];
// Framework-owned pages Next.js generates itself. `_global-error.html` contains a "try again" <form>
// that posts nothing; it is excluded and named in the guard's note so the exclusion is visible.
const FRAMEWORK_HTML = new Set([".next/server/app/_global-error.html"]);

const HTML_RULES = [
  { re: /<(form|input|textarea|select)\b/i, label: "form control in built HTML" },
  { re: /<script[^>]+src=["']https?:\/\//i, label: "third-party script in built HTML" },
];

export default function boundary() {
  if (!hasSrc()) return result("N/A", [], "src/ does not exist yet");
  const findings = scan(srcFiles([".ts", ".tsx", ".js", ".jsx"]), SRC_RULES);
  for (const f of walk("src/app")) {
    if (/\/route\.(t|j)sx?$/.test(f)) findings.push(`${f} — route handler (the product has no API surface)`);
  }
  const allHtml = walk(".next/server/app").filter((f) => f.endsWith(".html"));
  const html = allHtml.filter((f) => !FRAMEWORK_HTML.has(f));
  findings.push(...scan(html, HTML_RULES, { skipComments: false }));
  const skipped = allHtml.length - html.length;
  const note = allHtml.length
    ? `${html.length} built HTML files scanned${skipped ? `, ${skipped} framework-owned skipped (_global-error)` : ""}`
    : "no build present; source only";
  return result(findings.length ? "FAIL" : "PASS", findings, note);
}
