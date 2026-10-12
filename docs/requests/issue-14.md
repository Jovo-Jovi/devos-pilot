# Issue #14 — Staff editor backed by Supabase (the `operator` zone)

- **Decision:** accepted.
- **OD:** OD-10 (DRAFT, signed by merging the intake PR). It amends OD-01 §2 and supersedes ADR-001
  for notices and opening hours.
- **Tasks:** T11–T18. **Gate:** `G-Staff-editor` on T18.
- **First fence:** `docs/fences/T11.md`.
- **Intake date:** 2026-10-12, against `main` @ `4a367dd`.

## What was asked (the request, verbatim)

> **What should change:** Move the library's notices and weekly opening hours from content/*.json into
> Supabase, using the backend module (docs/method/FULLSTACK_MODULE.md). This supersedes ADR-001.
>
> Add a staff area at /[locale]/staff, in both languages. Invited library staff sign in with email and
> password plus a TOTP second factor, following the handbook's Profile A reference architecture (§9).
> Once signed in, staff can: create, edit, publish and unpublish notices in both languages; edit the
> weekly opening hours.
>
> The public pages read only published rows. When staff publish, the public pages update without a
> redeploy.
>
> I am deciding the following as the client, so please draft an OD that amends OD-01: Open one zone
> named operator, covering the staff routes and the Supabase client code. The zone holds no personal
> data from the public. There is no public sign-up: accounts exist only by invitation. Visitors keep
> giving nothing: no forms, cookies or storage outside the zone, and still no analytics.
>
> **Why:** To test the Dev OS method on a full-stack feature, end to end through the automated cycle:
> migrations as code; RLS proven by tests; staff sign-in with a second factor; server actions and
> cache refresh; the deploy order (backup, then migrations, then the app).
>
> **How you will judge it done:** An invited staff account can sign in on production, including the
> second factor. A notice published there appears on /ar/notices and /en/notices without a redeploy.
> An unpublished notice is never visible to an anonymous visitor, and a pgTAP test in supabase/tests/
> proves it. Writes without the staff claim and the second factor are refused, and a test proves that
> too. Every check is green, including db, db-test and types. The production deploy log shows the
> encrypted backup, then the migrations, then the app. The public pages look exactly as they do now.
>
> **Priority:** Next up

## How it was read

This is the second row of `docs/method/FULLSTACK_MODULE.md` §1 exactly: Profile A plus a staff
dashboard, with an `operator` zone. The request asks in its own words for the profile's boundary to
change, and says it decides that as the client (OD-02). So it is accepted as a DRAFT OD that amends
OD-01 by number (PR-19), not refused under the Boundary gate.

It opens no personal-data zone. Staff accounts are not "data from the public", and they live only in
Supabase Auth. So the Personal-Data Protection gate does not apply, and no `docs/PROTECTION_MODEL.md`
is written. Every gate stays in place: visitors still give nothing, outside the zone nothing changes,
and analytics are allowed nowhere.

## What was decided

- **OD-10** was drafted in `docs/DECISIONS.md`, with amendment A-2 in `docs/SCOPE.md` §3.
- **`docs/DATA_MODEL.md`** is new (precedence 7):
  - two tables, `library_notices` and `opening_slots`, with no attribution column;
  - explicit privileges, and RLS with eight named policies;
  - the staff check `private.is_staff_aal2()`: the claim is the JSON `true` at
    `app_metadata.staff`, and the session is at AAL2;
  - how the human invites staff and grants or revokes the claim (dashboard plus one SQL statement;
    no address ever enters the repository);
  - the clients, the generated types, the seed and the migrations.
- **`docs/BOUNDARY_MODEL.md`**: the `devos:boundary` line now declares the zone `operator`. Its
  source is `src/app/[locale]/staff/**`, `src/lib/supabase/**` and `src/proxy.ts`; its URL is
  `/staff`; `personal_data` is false. A new §4 describes the zone, and §2 states that the product's
  own Supabase is first-party and reached from the server only. `node scripts/guards/run-all.mjs` →
  `boundary PASS (…; profile A; zones: operator)`.
- **`docs/SECURITY_MODEL.md`**:
  - §1: principals and keys;
  - new §2a: staff routes get `form-action 'self'` and nothing else changes;
  - §3: Supabase Auth rate limits, AAL2 step-up, sessions only on staff URLs, the single-use
    invitation token, recovery through the dashboard.
- **`docs/CONTENT_MODEL.md`, `docs/I18N_MODEL.md` §7, `docs/DESIGN_SYSTEM.md` §9** (staff pages: the
  existing tokens and components only, single-column labelled forms), **`docs/PRODUCT_BRIEF.md`**
  (precedence 1; it said "no sign-in, no dashboard, no form and no database"),
  **`docs/adr/ADR-002-supabase-store.md`** and the status line of ADR-001.
- **Tasks:** eight, each leaving the product working.

  | Task | What | Risk | Why that risk |
  |---|---|---|---|
  | T11 | Module foundation, first migration with RLS, 46-assertion pgTAP proof, helpers; nothing visible | 3 | migration |
  | T12 | The data move as its own migration, with counts before and after (4 notices: 3 published, 1 draft; 7 slots) | 3 | migration |
  | T13 | Public pages read from the database through tag-cached reads, and look the same | 2 | |
  | T14 | Staff sign-in with TOTP, the session proxy and the staff CSP | 3 | auth, headers |
  | T15 | Invitation acceptance | 3 | auth |
  | T16 | Notices editor and the refresh by tag | 3 | first write path |
  | T17 | Opening-hours editor | 2 | |
  | T18 | Whole-zone end-to-end proof against the CI database; gate `G-Staff-editor` | 2 | gate |
- **The issue's "done" tests map as follows:**
  - pgTAP for drafts and refused writes: T11, and again end to end at T18;
  - green `db`, `db-test` and `types`: from T11 on;
  - the public pages unchanged: T13 and T18;
  - the three production checks: the human, after the `G-Staff-editor` merge (OD-10 §11).

## What was left out, and why

- **A browser Supabase client and a secret-key (admin) client.** The template for a module's first
  task lists both, but nothing in this request needs them:
  - Every call to Supabase is made on the server, so the CSP `connect-src` stays `'self'`.
  - No in-app call needs the service role, because invitations come from the dashboard.
  - Leaving them out keeps the most dangerous key out of Vercel. `SETUP.md` §12.3 still tells the
    human to set `SUPABASE_SECRET_KEY` there; OD-10 §10 overrides it for this project.
- **In-app invitations, account management, password recovery, deleting notices, moving
  `LibraryProfile`.** None was asked for. Recovery is done by the human in the dashboard
  (`DATA_MODEL.md` §5).
- **Removing `content/library-notices.json` and `content/opening-slots.json`.** `content/**` is
  outside the builder's surface, and the files are the signed record of what moved. The app stops
  reading them at T13, and the human decides their fate later.
- **`docs/GLOSSARY.md`.** It is outside the intake surface (`devos.config.json` `surfaces.intake`),
  so it is described here for the human rather than edited. Its §3 reason for forbidding `user`
  ("There are no accounts") is now out of date, though the rule itself still stands: the plan never
  names anything `user`. Before T14, the human may add a §1 term for the staff account (for example,
  `StaffAccount` — حساب موظف, "an invited Supabase Auth account holding the staff claim; never a
  visitor"). Until then, the T14 and later fences avoid a new PascalCase entity type for it.
- **Stale ledgers outside the intake surface**, recorded and not edited:
  - `docs/SESSION_CONTEXT.md` still shows T10 awaiting its verdict (T11 S15 brings it up to date).
  - `docs/SCOPE.md` §4 still shows the T06 inventory (T10 a3 carry-forward (c)); it was not part of
    this request.
- **A preview database** (`DEVOS_PREVIEW_DB`). It is not needed: the review uses the local build
  against the CI database (PR-18).

## Rehearsal

- **Guards.** `node scripts/guards/run-all.mjs` on this intake's tree prints PASS for seven guards
  (`phases` `18 tasks, 10 PASS`; `boundary` `…; profile A; zones: operator`). `data` prints N/A
  until T11 creates `supabase/`.
- **The T11 migration** was applied to a throwaway PostgreSQL 16 in `/tmp`, outside the repository,
  with stand-ins for Supabase's roles, `auth.jwt()` and default grants. The policies and privileges
  match `DATA_MODEL.md` §3. All 32 behavioural assertions of the pgTAP file, mirrored in plain SQL,
  passed, and so did six constraint checks.
- **Not run here:** pgTAP, the Supabase CLI and a build, because none is installed in the intake
  runner. The T11 fence says so in its Rehearsed line.
