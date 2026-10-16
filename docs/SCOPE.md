# PILOT — Scope

Precedence 2, with `DECISIONS.md`. Derived from OD-01 to OD-06 (there is no quotation: the pilot
has no client and no price).

## 1. Scope as signed (baseline, 2026-10-10)

| # | Deliverable | Station | Task |
|---|---|---|---|
| S-1 | App shell: locales `ar`/`en`, RTL/LTR from the URL, tokens, catalogues, checks | J4 | T01 |
| S-2 | Security-header baseline | J4 | T02 |
| S-3 | Home page: library name, opening hours, latest notices, footer with contact | J5 | T03 |
| S-4 | Notices page: every published `LibraryNotice`, newest first | J5 | T04 |
| S-5 | Rendered evidence in both locales (Playwright) | J5 | T05 |
| S-6 | Inventory script and documents brought to the delivered state | J9 | T06 |

## 2. Out of scope

Accounts, dashboard, search, media library, forms of any kind, analytics, deployment, a custom
domain, a database. Anything else is out of scope until an OD adds it.

## 3. Amendments

| # | Amendment | Decision | Tasks |
|---|---|---|---|
| A-1 | Build design v2 (OD-07) on the home and notices pages in both locales: v2 tokens and faces, reading-room timetable, open-now status and today line, date-stamped notices. No new content, route or data collection. | OD-09 (DRAFT until the intake PR for issue #7 merges) | T07–T10 |
| A-2 | Staff editor on Supabase. Notices and weekly opening hours move from `content/*.json` into Supabase Postgres (migrations as code, RLS proven by pgTAP). A staff area at `/[locale]/staff` (the `operator` zone, both locales) has invite-only accounts that sign in with email, password and TOTP (AAL2). There, staff create, edit, publish and unpublish notices and edit the weekly opening hours. The public pages read published rows only, refresh on publish without a redeploy, and look as before. This brings into scope, inside the zone only: staff accounts, a dashboard, staff forms and a database. Visitors still give nothing: §2 holds for them, with no analytics. | OD-10 (DRAFT until the intake PR for issue #14 merges) | T11–T18 |
| A-3 | Book types and their covers. A public page `/[locale]/book-types` (both locales, linked from the home page) lists 5 synthetic book types read on the server from Cloud Firestore, seeded from `firebase/seed/book_types.json`, with a cover or the design system's placeholder. Staff at AAL2 upload, replace or remove each type's cover on `/[locale]/staff/book-types`: JPEG, PNG or WebP up to 5 MB, re-encoded to WebP without metadata and stored in Cloudflare R2; the link from type to image is a Supabase table. This brings into scope Firestore (server reads only) and object storage (staff uploads only). Visitors still give nothing. | OD-11 (DRAFT until the intake PR for issue #26 merges) | T19–T25 |

## 4. Delivered scope

Delivered at T06. Figures from `node scripts/inventory.mjs`.

| # | Deliverable | Delivered | Evidence |
|---|---|---|---|
| S-1 | App shell: locales `ar`/`en`, RTL/LTR from the URL, tokens, catalogues, checks | yes | docs/reviews/T01-a1.md |
| S-2 | Security-header baseline | yes | docs/reviews/T02-a1.md |
| S-3 | Home page: library name, opening hours, latest notices, footer with contact | yes | docs/reviews/T03-a1.md |
| S-4 | Notices page: every published `LibraryNotice`, newest first | yes | docs/reviews/T04-a1.md |
| S-5 | Rendered evidence in both locales (Playwright) | yes | docs/reviews/T05-a1.md |
| S-6 | Inventory script and documents brought to the delivered state | yes (this task) | docs/reports/T06.md |

```text
inventory: PILOT
routes: 2
  /[locale]
  /[locale]/notices
redirects: 1
  / -> /ar
components: 7
  Bidi
  LocaleSwitch
  NoticeCard
  OpeningHours
  PendingState
  SiteFooter
  SiteHeader
catalogue keys: ar 19, en 19, identical yes
content: LibraryProfile 1, OpeningSlot 7, LibraryNotice 4 (published 3, draft 1)
guards: 7
  secrets
  phases
  naming
  design
  i18n
  boundary
  literals
tests: unit 32, e2e 7
```

Withdrawn: none. Excluded: none (§2 unchanged).
