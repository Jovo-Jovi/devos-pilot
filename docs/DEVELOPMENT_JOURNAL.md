# PILOT — Development journal

Append-only. Newest entry last. One entry per task attempt, written by the builder; the reviewer's
verdicts live in `docs/reviews/`.

---

## 2026-10-10 — B0 bootstrap (reviewer surface, Claude)

Dev OS v2 fit research done (`docs/method/DEVOS_FIT.md`). Profile A, Boundary gate, no domain gate.
Stations J0–J3 compressed into the bootstrap: the human plays the client (OD-02). Automation
(OD-03): GitHub Actions runner relays fences and reports between Cursor (Grok 4.7 high) and Claude
Code. Cursor marketplace reviewed for tooling (OD-06): Context7 and Playwright MCP only. Fence T01
issued.

---

## 2026-10-10 — T01 foundation (builder, Grok 4.7)

Next.js 16.4.0 app shell with Cache Components and Partial Prefetching. Locales `ar` (default, rtl)
and `en` (ltr) come from the first URL segment; `/` redirects to `/ar` with status 307. Catalogues,
design tokens, the shell page, and the two unit tests are in place. `pnpm check` exits 0. Awaiting
verdict.

---

## 2026-10-10 — T02 security-header baseline (builder, Grok 4.7)

`next.config.ts` `headers()` sends the six headers from `docs/SECURITY_MODEL.md` §2 on `/:path*`.
`Strict-Transport-Security` is `max-age=86400` with no `includeSubDomains`. `src/security/headers.test.ts`
imports that array. Nonce-based CSP is a carry-forward candidate, not implemented. `pnpm check` exits 0.
Awaiting verdict.

---

## 2026-10-10 — T03 home composition (builder, Grok 4.7)

The home page at `/[locale]` renders the library name, opening hours and footer from the signed
content files. Parsers reject invalid content at build time, and opening slots are ordered
Sunday-first. Latest notices stay out until T04. Carry-forwards CF-001, CF-002 and CF-003 are
landed from the T02 verdict. `pnpm check` exits 0. Awaiting verdict.

---

## 2026-10-10 — T04 library notices (builder, Grok 4.7)

The home page shows the three newest published notices, and `/[locale]/notices` lists every
published notice, newest first. A draft never renders. `pnpm check` exits 0. Awaiting verdict.

---

## 2026-10-10 — T05 rendered evidence (builder, Grok 4.7)

Playwright runs the production build in both locales and saves four screenshots under
`.devos/screenshots/`. Pending states are proved by a unit fixture, because the content is bundled
at build time and a built page cannot be emptied from a browser test. `pnpm check` exits 0.
Awaiting verdict.

---

## 2026-10-10 — T06 inventory script and delivered-state documents (builder, Grok 4.7)

`scripts/inventory.mjs` prints routes, redirects, components, catalogue keys, content counts,
guards and tests from the tree. `docs/SCOPE.md` §4 is filled from that output. The design,
security, content and i18n documents are at the delivered state. CF-003 is closed. CF-004,
CF-005 and CF-006 are landed from the T05 verdict, and the triage table is for the human at
G-Harden. `pnpm check` exits 0. Awaiting verdict.

---

## 2026-10-10 — T07 design v2 shell (builder, Grok 4.7)

The home and notices pages use the v2 tokens, Reem Kufi and Readex Pro, the header, the footer
and the page frame. Opening hours stay a table and notices stay cards, restyled on the v2 tokens
only. `pnpm check` exits 0. Awaiting verdict.

---

## 2026-10-10 — T08 design v2 timetable (builder, Grok 4.7)

`Timetable` replaces `OpeningHours` on the home page: one row per day from Saturday to Friday,
with lapis bars on an 08:00–22:00 axis placed by logical properties so Arabic mirrors. Bar
placement is a pure function with six unit tests. There is no today highlight (T09). `pnpm check`
exits 0. Awaiting verdict.

---

## 2026-10-10 — T09 design v2 hero (builder, Grok 4.7)

The home hero shows an open-now status chip and a today line, and the timetable highlights
today's row. All three are computed on the client in Africa/Cairo after hydration and render
nothing on the server. The time logic is pure and unit-tested at fixed instants. `pnpm check`
exits 0. Awaiting verdict.

---

## 2026-10-10 — T10 design v2 notices (builder, Grok 4.7)

`NoticeCard` is replaced by date-stamped `NoticeEntry` rows: an ordered list, a `DateStamp`
(day over the localised month from `Intl`) at the inline start, and a 1px rule between entries.
The stamp outline is `0.125rem`, which is 2px at the 16px root and passes `guard:design`. CF-005
is closed. `pnpm check` exits 0. Awaiting verdict.

---

## 2026-10-11 — T10 design v2 notices, attempt 3 (builder, Grok 4.7)

English notice titles on the notices page are `h2`, so they were taking the display word spacing
from `global.css` line 42. One rule sets `word-spacing: normal` on those titles only. The notices
e2e test asserts the computed value is `0px` in both locales. `pnpm check` exits 0. Awaiting verdict.

---

## 2026-10-12 — T11 backend module foundation (builder, Grok 4.7)

The local Supabase project is on, with public sign-up off and TOTP on. Postgres major version is 17. One migration creates `private.is_staff_aal2()`, `library_notices` and `opening_slots`, with explicit privileges, row level security and the eight policies. pgTAP (`Files=1, Tests=46`) proves each principal. The public pages are unchanged and still read `content/*.json`. Awaiting the heavyweight review.

---

## 2026-10-12 — T12 content moved into the database (builder, Grok 4.7)

The signed rows of `content/library-notices.json` and `content/opening-slots.json` now reach every database through `20261012090153_move_library_content.sql`: 4 notices (3 published, 1 draft) and 7 opening slots, `on conflict (id) do nothing`. pgTAP (`Files=2, Tests=63`) proves each moved row and that an anonymous visitor reads the three published notices, newest first, and never the draft. The pages still read the JSON files. Awaiting the heavyweight review.

---

## 2026-10-12 — T13 public pages read the database (builder, Grok 4.7)

The home and notices pages read published `LibraryNotice` rows and every `OpeningSlot` from the database, on the server, through cache entries tagged `library-notices` and `opening-slots`. `LibraryProfile` stays in `content/library-profile.json`. The pages stay prerendered, set no cookie, and look the same as the JSON build. `pnpm check` exits 0. Awaiting verdict.

---

## 2026-10-12 — T14 staff sign-in, attempt 2 (builder, Grok 4.7)

Staff sign in with a password, enrol or answer a TOTP factor, and reach the staff home at AAL2. The session proxy is limited to the staff routes. Public pages stay static and cookieless, with `form-action 'none'`; staff routes send `form-action 'self'`. Local password sign-in is on and sign-up stays off. `pnpm check` exits 0. Awaiting the heavyweight review.

---

## 2026-10-12 — T15 staff invitation, attempt 1 (builder, Grok 4.7)

An invited staff member opens one confirm link, sets a password, enrols TOTP, and reaches the staff home. The confirm route is the only route handler. Public pages stay static and cookieless. The local invitation template points at `/ar/staff/auth/confirm` with `token_hash` and `type=invite`. `pnpm check` exits 0. Awaiting the heavyweight review.

---

## 2026-10-12 — T16 notices editor, attempt 1 (builder, Grok 4.7)

Staff at AAL2 list every `LibraryNotice`, create one as a draft, edit it, publish it and unpublish it. Each successful write calls `updateTag("library-notices")`, so `/ar`, `/en`, `/ar/notices` and `/en/notices` show the change on the next request without a rebuild. There is no delete. `zod` checks the five fields against the date and non-empty rules. `pnpm check` exits 0. Awaiting the heavyweight review.

---

## 2026-10-12 — T17 opening-hours editor, attempt 1 (builder, Grok 4.7)

Staff at AAL2 see the week from Saturday to Friday and add, change and remove an `OpeningSlot`. Each successful write calls `updateTag("opening-slots")`, so the home timetable, the status chip and the today line follow on the next request without a rebuild. `zod` checks the day, the `HH:MM` pair and the optional note pair. `pnpm check` exits 0. Awaiting verdict.

---

## 2026-10-12 — T18 whole-zone end-to-end proof, attempt 1 (builder, Grok 4.7)

`e2e/staff-zone.spec.ts` runs the `operator` zone against the local database with no application change: an invited account sets a password and enrols TOTP, a `LibraryNotice` is published and then unpublished while five anonymous renders overlap, REST writes without the staff claim at AAL2 are refused, and Tuesday's close follows on both home pages before it is restored. The four public routes stay `○`, cookieless and formless. `pnpm check` exits 0. Awaiting verdict and the human's merge of gate `G-Staff-editor`.
