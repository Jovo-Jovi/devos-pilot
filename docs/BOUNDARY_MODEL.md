# PILOT — Boundary model (non-waivable, OD-01 §3)

Precedence 4.

<!-- devos:boundary {"profile":"A","zones":[{"name":"operator","src":["src/app/[locale]/staff/**","src/lib/supabase/**","src/lib/r2/**","src/proxy.ts"],"urls":["/staff"],"personal_data":false}]} -->

The line above is read by `guard:boundary` (PR-19). Only a signed OD changes it: it names the
profile and any zone (a staff dashboard, a member area) where forms, cookies and route handlers
are allowed. Outside a zone, §2 holds in full. Analytics and third-party scripts are never allowed.
The `operator` zone is declared by OD-10 (DRAFT until the intake PR for issue #14 merges); §4 describes it.
OD-11 (DRAFT until the intake PR for issue #26 merges) adds the storage code `src/lib/r2/**` to its
source; its URLs and `personal_data: false` are unchanged.

## 1. The rule

No table, column, storage, form, input, route handler, cookie, local storage, log line, analytics
or tracking script accepts or keeps a visitor's personal data. The product reads its own content
and renders it. Nothing flows back.

## 2. What is forbidden in `src/**` outside a zone

- `<form`, `<input`, `<textarea`, `<select`
- `document.cookie`, `cookies()`, `localStorage`, `sessionStorage`, `indexedDB`, `navigator.sendBeacon`
- `route.ts` / `route.js` handlers (the public site has no API surface)
- any script or `fetch` to a third-party host; any analytics package (PostHog, GA, Sentry browser SDK)

The product's own Supabase project (OD-10) is not a third party. Only server code calls it, through
`src/lib/supabase/`. The browser never does.

The product's own Firestore database and R2 bucket (OD-11) are not third parties either. Firestore is
read by server code only, through `src/lib/firebase/`; the browser never loads a Firebase script or
SDK, and analytics, performance and messaging SDKs are forbidden everywhere (`guard:services`). The
bucket is written only by staff-zone server actions, through `src/lib/r2/`; the browser only loads
its public images (`<img>`, CSP `img-src`), and sends nothing to it.

`guard:boundary` checks the source and, after a build, the built HTML.

## 3. Evidence at every gate

`pnpm guards` output with `boundary: PASS`, plus the reviewer's own scan of the built HTML for the
patterns above, stated with the command. From T14 on, the reviewer also shows that the public routes
(`/ar`, `/en`, `/ar/notices`, `/en/notices`) answer with no `set-cookie` header.

## 4. Zones

### `operator` (OD-10): the staff editor

| | |
|---|---|
| Source | `src/app/[locale]/staff/**`, `src/lib/supabase/**`, `src/lib/r2/**` (OD-11), `src/proxy.ts` |
| URLs | `/ar/staff/**`, `/en/staff/**` (`"urls":["/staff"]` after the locale) |
| Who | invited staff only (`docs/DATA_MODEL.md` §1, §5); visitors are sent to sign-in and can do nothing there |
| Personal data | **none from the public**. Staff accounts (email, password hash, TOTP factor) live only in Supabase Auth's `auth` schema; no `public` table refers to a person. Cover images (OD-11) are library content uploaded by staff, stored with all metadata removed |
| Allowed inside | forms and inputs, server actions, the Supabase Auth session cookies (set and refreshed only on these URLs: the proxy's matcher is limited to them), one route handler (`staff/auth/confirm`, the invitation link) |
| Never allowed, even inside | analytics, trackers, third-party scripts, beacons, browser storage, logging request bodies or credentials, a browser call to Supabase |
| Proof | `guard:boundary` (zone-aware), `guard:data`, the pgTAP RLS tests, and the reviewer's no-`set-cookie` check on public routes |

A zone with personal data from the public would need a new OD, `docs/PROTECTION_MODEL.md` and the
Personal-Data Protection gate (handbook §10.3).
