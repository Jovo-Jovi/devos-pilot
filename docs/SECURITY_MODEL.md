# PILOT — Security model

Precedence 5.

## 1. Principals and keys

There are no principals: no sign-in, no roles, no service key. The repository holds no secret. CI
secrets (`CURSOR_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY`, optional `DEVOS_PAT`)
live only in GitHub Actions secrets and never appear in files, logs, reports or prompts.

## 2. Header baseline (T02, risk 3)

Set in `next.config.ts` `headers()` for every route (`source: "/:path*"`):

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=86400` (short until a launch; never `includeSubDomains` in the pilot) |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `X-Frame-Options` | `DENY` |
| `Content-Security-Policy` | `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'` |

`'unsafe-inline'` for scripts is accepted for the pilot (Next.js inline bootstrap); removing it with nonces is carry-forward CF-001 (open). Delivered at T02: `securityHeaders` in `next.config.ts`, asserted by `src/security/headers.test.ts`. The `/` → `/ar` redirect response carries none of the six headers; whether §2 covers redirect responses is carry-forward CF-002 (open, the human's decision).

## 3. Rate limiting, step-up, recovery

Not applicable: no write surface, no accounts.
