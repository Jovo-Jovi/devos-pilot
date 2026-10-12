// guard:secrets — no credential, key, token or project ref in any committable file (Dev OS §7).
import { repoFiles, scan, result } from "./lib.mjs";

const RULES = [
  { re: /sk-ant-[A-Za-z0-9_-]{20,}/, label: "Anthropic key" },
  { re: /\bgh[pousr]_[A-Za-z0-9]{30,}/, label: "GitHub token" },
  { re: /\bgithub_pat_[A-Za-z0-9_]{30,}/, label: "GitHub fine-grained token" },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, label: "private key" },
  { re: /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/, label: "JWT / service key" },
  { re: /\b(CURSOR_API_KEY|ANTHROPIC_API_KEY|CLAUDE_CODE_OAUTH_TOKEN|DEVOS_PAT|SUPABASE_SERVICE_ROLE_KEY)\s*[=:]\s*["']?[A-Za-z0-9_\-]{16,}/, label: "secret assignment" },
  { re: /\b[a-z]{20}\.supabase\.co\b/, label: "Supabase project ref" },
  { re: /\bsb_secret_[A-Za-z0-9_-]{16,}/, label: "Supabase secret key" },
  { re: /\bsbp_[a-f0-9]{32,}/, label: "Supabase access token" },
  { re: /\b(SUPABASE_SECRET_KEY|SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD|DEVOS_BACKUP_PASSPHRASE|VERCEL_TOKEN)\s*[=:]\s*["']?[A-Za-z0-9_\-]{16,}/, label: "secret assignment" },
  { re: /postgres(ql)?:\/\/[^\s:]+:[^\s@]+@/, label: "connection string with password" },
];
const SKIP = [/^pnpm-lock\.yaml$/, /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|pdf|zip)$/i, /^scripts\/guards\/secrets\.mjs$/];

export default function secrets() {
  const files = repoFiles().filter((f) => !SKIP.some((s) => s.test(f)));
  const findings = scan(files, RULES, { skipComments: false });
  return result(findings.length ? "FAIL" : "PASS", findings, `${files.length} files scanned`);
}
