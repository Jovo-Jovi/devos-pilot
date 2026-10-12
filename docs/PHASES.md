# PILOT — Phases and tasks

The runner reads the table below, and `guard:phases` checks it.

- **Done:** `[x]` only with a PASS verdict file. The runner ticks it (OD-03 §1), never the builder.
- **Gate:** a value other than `—` means this task closes a station gate. Its PASS stops the
  cycle for the human (OD-03 §4). Every risk-3 task stops the cycle too.
- **Verdict:** `PASS aN — <file>` or `FAIL aN — <file>`, written by the runner.

| Task | Phase | Station | Name | Risk | Gate | Done | Verdict |
|---|---|---|---|---|---|---|---|
| T01 | P01 | J4 | Foundation: app shell, locales, tokens, catalogues, checks | 2 | — | [x] | PASS a1 — docs/reviews/T01-a1.md |
| T02 | P01 | J4 | Security-header baseline | 3 | G-Foundation | [x] | PASS a1 — docs/reviews/T02-a1.md |
| T03 | P02 | J5 | Home composition: header, opening hours, footer | 2 | — | [x] | PASS a1 — docs/reviews/T03-a1.md |
| T04 | P02 | J5 | Library notices: home teaser and notices page | 2 | — | [x] | PASS a1 — docs/reviews/T04-a1.md |
| T05 | P02 | J5 | Rendered evidence in both locales (Playwright) | 2 | G-Public | [x] | PASS a1 — docs/reviews/T05-a1.md |
| T06 | P03 | J9 | Inventory script and delivered-state documents | 1 | G-Harden | [x] | PASS a1 — docs/reviews/T06-a1.md |
| T07 | P04 | J5 | Design v2 shell: tokens, faces, header, footer, page frame | 2 | — | [x] | PASS a1 — docs/reviews/T07-a1.md |
| T08 | P04 | J5 | Design v2 timetable (replaces OpeningHours) | 2 | — | [x] | PASS a1 — docs/reviews/T08-a1.md |
| T09 | P04 | J5 | Design v2 hero: open-now status chip, today line, today highlight | 2 | — | [x] | PASS a1 — docs/reviews/T09-a1.md |
| T10 | P04 | J5 | Design v2 date-stamped notices and final visual check | 2 | G-Design-v2 | [x] | PASS a3 — docs/reviews/T10-a3.md |
| T11 | P05 | J4 | Backend module: Supabase project, first migration with RLS, pgTAP proof, client helpers | 3 | — | [x] | PASS a1 — docs/reviews/T11-a1.md |
| T12 | P05 | J4 | Move notices and opening hours from the JSON files into the database | 3 | — | [x] | PASS a1 — docs/reviews/T12-a1.md |
| T13 | P05 | J5 | Public pages read published rows from the database, cached by tag | 2 | — | [x] | PASS a1 — docs/reviews/T13-a1.md |
| T14 | P05 | J6 | Staff sign-in: password, TOTP enrolment and challenge, session proxy, staff headers | 3 | — | [x] | PASS a2 — docs/reviews/T14-a2.md |
| T15 | P05 | J6 | Staff invitation: confirm link, set password, then TOTP | 3 | — | [ ] | — |
| T16 | P05 | J6 | Notices editor: create, edit, publish, unpublish; public pages refresh by tag | 3 | — | [ ] | — |
| T17 | P05 | J6 | Opening-hours editor: add, change and remove periods | 2 | — | [ ] | — |
| T18 | P05 | J6 | Whole-zone end-to-end proof against the CI database | 2 | G-Staff-editor | [ ] | — |

## Phase outlines (the reviewer writes each fence from these)

- **T01**: issued, `docs/fences/T01.md`.
- **T02**: `next.config.ts` `headers()` with the exact table in `SECURITY_MODEL.md` §2. Add
  `scripts/devos/probe.mjs`-verifiable evidence and a Vitest test that imports the config and
  asserts each header. Log CF for nonce-based CSP. Heavyweight review.
- **T03**: content loader with schema validation (`src/content/`), `SiteHeader`, `LocaleSwitch`,
  `OpeningHours`, `PendingState`, `SiteFooter`, `Bidi`; the home composition from
  `DESIGN_SYSTEM.md` §3 without the notices region. Unit tests for the loader and day ordering.
- **T04**: `NoticeCard`; published-only, newest-first selector with tests; the home's latest-3
  region; `/[locale]/notices`.
- **T05**: Playwright: `/ar` has `dir="rtl"`, `/en` has `dir="ltr"`; the switch keeps the path;
  phone and times are inside `<bdi>`; the pending state renders when a fixture empties the content;
  screenshots of both locales as CI artefacts; `e2e` script wired into the checks. Gate G-Public.
- **T06**: `scripts/inventory.mjs` prints routes, components, catalogue keys, content counts,
  guard list; `SCOPE.md` §4 filled from it; every model document brought to the delivered state;
  carry-forward triage table for the human. Gate G-Harden.
- **T07** (OD-09, issue #7): issued, `docs/fences/T07.md`. v2 tokens (`DESIGN_SYSTEM.md` §1) with
  the phone override; Reem Kufi + Readex Pro via `next/font/google` in both root layouts; `Bidi` as
  `<bdi dir="ltr">`; `SiteHeader` (brand link, current-page `aria-current`, outlined `LocaleSwitch`
  pill, 44px tap targets), `SiteFooter` (definition lists), `PendingState` muted; page frame (`.wrap`,
  hero `h1`, section `h2`, notices `h1`); tagline removed; interim restyle of `OpeningHours` and
  `NoticeCard` on v2 tokens only. e2e: faces, `aria-current`, no horizontal scroll at 390px.
- **T08**: `Timetable` replaces `OpeningHours` (§3): Saturday→Friday rows from catalogue day names,
  axis ticks 08–22, lapis bars placed by `inset-inline-start`/`inline-size` percentages of 08:00–22:00
  from a pure, unit-tested function, times in `Bidi` joined by `list.and`, "Closed" from
  `state.closed`, `OpeningSlot` notes under the day name, `timetable.label` as the panel's accessible
  name; phone single column. Catalogue keys `state.closed`, `list.and`, `timetable.label`. e2e: the
  times-in-`bdi` test moves to the new markup; a bar is mirrored between `/ar` and `/en`. No today
  highlight yet. `OpeningHours.tsx` deleted.
- **T09**: client time logic in `Africa/Cairo` (pure functions with unit tests at fixed instants:
  open, between periods, after closing, on the closed Friday, across the week end) and a
  `useSyncExternalStore` clock with a `null` server snapshot; `StatusChip`, `TodayLine` and the today
  row highlight in `Timetable` (`DESIGN_SYSTEM.md` §8.1). Catalogue keys `status.openUntil`,
  `status.closedOpens`, `today.label`, `today.closed`. e2e with Playwright's clock fixed to a known
  Cairo instant: chip text, today line, one highlighted row; server HTML contains none of them.
  Boundary: the client code reads only the clock.
- **T10**: `NoticeEntry` and `DateStamp` replace `NoticeCard` on both pages (`<ol>` list, 1px
  separators, month names from `Intl.DateTimeFormat`); `NoticeCard.tsx` deleted; e2e notice tests move
  to the new markup and assert the stamp day and month per locale. Full visual check of all four pages
  at 1280px and 390px against `DESIGN_SYSTEM.md` and the mockup; record CF-005 as `CLOSED at T10` in
  `docs/method/CARRY_FORWARDS.md`. Gate G-Design-v2 (OD-07 §2): the human's merge signs it.

Phase P05, the staff editor on Supabase (OD-10, issue #14). The data model is `docs/DATA_MODEL.md`.
Every task runs against the throwaway local Supabase (PR-17). Every task that adds a migration stops
at the human gate.

- **T11** (OD-10, issue #14): issued, `docs/fences/T11.md`. Steps:
  - `supabase init`; in the local config, sign-up off and TOTP on;
  - the dependencies `@supabase/supabase-js`, `@supabase/ssr` and `server-only`;
  - one migration, `create_library_content`: `private.is_staff_aal2()`, `library_notices`,
    `opening_slots`, explicit privileges, RLS and the eight policies of DATA_MODEL §3;
  - the pgTAP proof `supabase/tests/database/library_content_rls.test.sql` (46 tests, every role);
  - a comment-only synthetic `supabase/seed.sql`;
  - the generated `src/lib/supabase/database.types.ts`;
  - `src/lib/supabase/env.ts` (with a unit test), `public.ts` (anonymous reads, no session) and
    `server.ts` (`server-only`, the staff session cookies).

  Nothing imports the helpers yet, and nothing visible changes. Risk 3, schema change, human gate.
- **T12**: steps and checks:
  - `supabase migration new move_library_content` holds only `insert … on conflict (id) do nothing`
    of every row of `content/library-notices.json` and `content/opening-slots.json`, field for field
    (DATA_MODEL §2 mapping).
  - Counts before and after:
    - before: `node -e` over the JSON gives 4 notices (3 published, 1 draft) and 7 slots;
    - after `supabase db reset`, `psql "$SUPABASE_DB_URL"` counts by status and the slot total are
      equal;
    - a pgTAP file `supabase/tests/database/library_content_move.test.sql` asserts every moved row
      and field.
  - The T11 RLS test still passes, the types are unchanged, the app still reads JSON, and nothing
    visible changes.

  Risk 3, schema change, human gate.
- **T13**: the home and notices pages read notices and opening slots from the database:
  - Server-side readers in `src/content/` use `createPublicReadClient()`. Notices are filtered to
    `status = 'published'` in the query as well as by RLS.
  - The readers are `'use cache'` functions with `cacheTag('library-notices')` /
    `cacheTag('opening-slots')` and a long `cacheLife`, so the pages stay prerendered.
  - Rows map from snake_case to the existing `LibraryNotice` / `OpeningSlot` types, through a pure,
    unit-tested mapper.
  - `LibraryProfile` stays on JSON. `src/app/pending.test.ts` mocks the readers.
  - No cookie, no browser call to Supabase, and no Supabase URL or key in `.next/static`.

  Checks: the 22 e2e tests pass unchanged. Before-and-after screenshots of the eight standard screens
  are identical ("look exactly as they do now"). Risk 2.
- **T14**: staff sign-in with a second factor:
  - `src/proxy.ts` refreshes the session, with the matcher limited to `/(ar|en)/staff/:path*`.
  - Routes:
    - `/[locale]/staff/sign-in`: email and password, through a server action;
    - `/[locale]/staff/mfa`: enrolment on the first sign-in (the QR image and the secret in `Bidi`),
      otherwise a challenge and a verify, ending at AAL2;
    - `/[locale]/staff`: the staff home, and sign-out.
  - One server-side check in the zone requires the staff claim and AAL2:
    - no session → sign-in;
    - AAL1 → MFA;
    - no claim → refused and signed out.
  - `next.config.ts` gets a second header entry for `/:locale/staff/:path*` with `form-action 'self'`
    (`SECURITY_MODEL.md` §2a), and `src/security/headers.test.ts` follows.
  - Catalogue keys `staff.*` in both locales. The pages compose `DESIGN_SYSTEM.md` §9.
  - The seed gets synthetic accounts on `example.com`: staff without a factor, staff with a verified
    TOTP factor whose secret is synthetic, and an account without the claim.
  - An e2e spec covers:
    - sign-in, enrolment, the staff home;
    - sign-in, the challenge, the staff home;
    - the account without the claim is refused;
    - an anonymous visit to `/ar/staff` is redirected;
    - `/ar`, `/en`, `/ar/notices` and `/en/notices` answer with no `set-cookie`.

  Types for the signed-in account avoid the forbidden nouns (`GLOSSARY.md` §3). Risk 3.
- **T15**: staff invitation acceptance:
  - A route handler `src/app/[locale]/staff/auth/confirm/route.ts` calls `verifyOtp` with
    `type: "invite"` and the `token_hash`. It then redirects to a clean URL.
  - `/[locale]/staff/password` sets the password, then goes on to the TOTP enrolment of T14.
  - In the local `supabase/config.toml`: `site_url`, the redirect URLs, and the invite template file
    under `supabase/templates/` with the link of DATA_MODEL §5.
  - An e2e test:
    - invites through the local admin API, with the throwaway secret key from the environment, in the
      test only;
    - reads the mail from the local mail server (`SUPABASE_MAIL_URL`);
    - follows the link, sets the password and enrols TOTP;
    - grants the claim (test-only admin call), signs in again and reaches the staff home.

  Risk 3.
- **T16**: the notices editor:
  - Routes: `/[locale]/staff/notices` (every notice, newest first, with its status),
    `/[locale]/staff/notices/new` and `/[locale]/staff/notices/[id]`.
  - Server actions create, update, publish and unpublish. They share a Zod schema that mirrors the
    DATA_MODEL §2 checks (dependency `zod`).
  - Each action checks the staff claim and AAL2 on the server before it writes, then invalidates
    `library-notices` (Next.js `updateTag`, per the bundled docs). There is no delete.
  - Arabic and English fields sit side by side (`DESIGN_SYSTEM.md` §9, `I18N_MODEL.md` §7).
  - Unit tests cover the schema.
  - An e2e test against `next start`, with no rebuild:
    - a draft is not public;
    - publishing shows it on `/ar/notices`, `/en/notices` and the home page's latest three;
    - unpublishing removes it;
    - an AAL1 session is refused;
    - the test leaves the data as it found it.

  Risk 3.
- **T17**: the opening-hours editor:
  - `/[locale]/staff/hours` shows the week from Saturday to Friday, with each day's periods.
  - Staff add, change and remove a period: day, opens, closes, and an optional note pair.
  - Server actions use a Zod schema that mirrors the table checks, and invalidate `opening-slots`.
  - An e2e test changes a period and sees the home timetable, the status chip and the today line
    follow without a rebuild, then restores the period.

  Risk 2.
- **T18**: `e2e/staff-zone.spec.ts` runs the whole zone against the CI database with the seeded and
  invited accounts:
  - invitation, password, TOTP;
  - publish, then the public pages in both locales update without a rebuild; then unpublish;
  - an anonymous REST read of drafts with the publishable key returns nothing;
  - REST writes are refused for anon, for an account without the claim and for staff at AAL1;
  - an hours edit, then a restore.

  The task also: rescans the built HTML and the public responses (no form, no cookie); runs a final
  visual check of the eight public screens against T13's; and writes a post-merge production
  checklist in the report for OD-10 §11. Gate `G-Staff-editor`: the human's merge signs it.
