# PILOT — Security model

Precedence 5.

## 1. Principals and keys

The repository holds no secret. CI secrets (`CURSOR_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN` or
`ANTHROPIC_API_KEY`, optional `DEVOS_PAT`) live only in GitHub Actions secrets and never appear in
files, logs, reports or prompts.

**From OD-10 (the `operator` zone, DRAFT until the intake PR for issue #14 merges):**

| Principal | How | Can |
|---|---|---|
| Visitor | no session, never identified | read published notices, opening slots and the library profile |
| Staff account | Supabase Auth, created only by invitation; staff claim `app_metadata.staff = true` granted by the human (`DATA_MODEL.md` §5); email + password, then TOTP | after AAL2: the staff pages and every write (`DATA_MODEL.md` §3) |

| Key or secret | Where it lives | Used by |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public values) | Vercel Production; the runner's `.devos/supabase.env` (local stack) | server code in `src/lib/supabase/` only; no browser client |
| `SUPABASE_SECRET_KEY` (service role) | **not** in Vercel (OD-10 §7); locally, the CLI's throwaway key in `.devos/supabase.env` | e2e tests only (invitations, test fixtures); no app code. `guard:data` fails any `src/` file that reads it outside a `server-only` module |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`, `DEVOS_BACKUP_PASSPHRASE` | GitHub Actions secrets | `devos-deploy` only (PR-18) |

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

## 2a. Staff routes (OD-10, lands at T14, risk 3)

A second `headers()` entry, `source: "/:locale/staff/:path*"`, placed **after** the baseline entry
(the later entry wins for the same key), sets one header:

| Header | Value |
|---|---|
| `Content-Security-Policy` | the §2 value with `form-action 'self'` in place of `form-action 'none'`, every other directive unchanged |

- **Why `form-action 'self'`.** Staff forms post to their own server actions on the same origin, and
  before hydration that is a native form submission. Public routes keep `form-action 'none'`.
- **`connect-src` stays `'self'`.** No code in the browser calls Supabase.
- **`img-src` already allows `data:`.** That covers the TOTP enrolment QR code that Supabase Auth
  returns as an SVG data URL.
- **Every other §2 header applies unchanged** to the staff routes.

## 3. Rate limiting, step-up, sessions, recovery

Before OD-10 none of this applied: there was no write surface and no account. With OD-10:
- **Rate limiting.** Supabase Auth's built-in limits on sign-in, token verification and emails (the
  hosted project's defaults; the CLI's defaults locally). Every write also needs AAL2. There is no
  app-level limiter.
- **Step-up.** TOTP brings the session to AAL2. Every staff page after sign-in and every write needs
  AAL2 and the staff claim. The app checks them on the server, and every RLS policy checks them in the
  database (`private.is_staff_aal2()`).
- **Sessions.** The session cookies are set by `@supabase/ssr`, only on staff URLs, and refreshed by
  `src/proxy.ts`, whose matcher is limited to the staff routes. No public response sets a cookie.
- **The invitation token.** The confirm route uses the `token_hash` once, then redirects at once to a
  URL without it. `Referrer-Policy` sends only the origin across origins.
- **Recovery** is done by the human in the dashboard. A lost TOTP factor is deleted, and the staff
  member enrols again. For a forgotten password, the human deletes the account and invites again
  (in-app recovery is out of scope, OD-10).
- **Revocation.** Removing the claim takes effect at the next token refresh (`DATA_MODEL.md` §5).
