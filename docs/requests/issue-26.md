# Issue #26 — Book types from Firestore, with staff cover images in Cloudflare R2

- **Decision:** accepted.
- **OD:** OD-11 (DRAFT, signed by merging the intake PR). It amends OD-10 §1 (the `operator` zone's
  source gains `src/lib/r2/**`), OD-10 §7 (two new server-only credentials) and OD-10 "Does not
  decide" (media). ADR-003 adds two stores next to ADR-002's Postgres.
- **Tasks:** T19–T25 (phase P06). **Gate:** `G-Book-types` on T25.
- **First fence:** `docs/fences/T19.md`.
- **Intake date:** started 2026-10-13 against `main` @ `f1f44b1`, stopped by a usage limit, and
  completed 2026-10-16 on the intake branch @ `86b344d` (main @ `11495be` merged in).

## What was asked (the request, verbatim)

> **What should change:** Add two backend services to the site, using the storage (R2) and Firebase
> modules (PR-26, docs/method/FULLSTACK_MODULE.md §9–11):
>
> Public "Book types" page at /[locale]/book-types, in Arabic and English, linked from the home page.
> It lists the book types read from Cloud Firestore (collection book_types, read on the server only).
> Each type shows its name, a one-line description and its cover image when one is set; without an
> image it shows the design system's placeholder.
>
> Book types come from a seed file in the repo (firebase/seed/book_types.json): 5 synthetic types,
> each with an id, a name and a description in Arabic and English, and a sort order. They are changed
> only by editing that file through a change request; the deploy writes it to Firestore. Staff do not
> edit types.
>
> Staff cover images in Cloudflare R2. A staff page at /[locale]/staff/book-types lists the types and
> lets a signed-in staff member (staff claim + AAL2, like the other editors) upload, replace or remove
> the cover image of each type. JPEG, PNG or WebP up to 5 MB, checked on the server, re-encoded to WebP
> at most 1200 px wide with all metadata removed, and stored in R2. The link from a type to its image
> lives in the Supabase database (staff write; the public page reads it). The old image is deleted
> when it is replaced or removed. Covers sit next to the type's name, so they are decorative (alt="").
> The staff home links to the new editor. Visitors never upload anything.
>
> **Why:** To test the method's storage and Firebase modules end to end, from the first setup task to
> a production deploy: local emulators in every run, the new guard and checks, human gates for the
> schema and rules changes, and the deploy's storage preflight, rules and seed steps.
>
> **How you will judge it done:** /ar/book-types and /en/book-types list the 5 seeded types in sort
> order, in the right language and direction, and the home page links to them in both locales. A staff
> member uploads a cover for one type in production; the public page shows it within a minute;
> replacing it shows the new one; removing it shows the placeholder. An upload over 5 MB or of another
> file type is refused with a clear message in both languages. The stored image is WebP with no EXIF
> data. A visitor or a staff member without AAL2 cannot upload. The Firestore rules refuse every
> client. Every run passes storage, firestore-seed, firestore-rules and guard:services. The production
> deploy shows the storage preflight, the Firestore rules and the seed steps passing.
>
> **How big is it?** Feature (several tasks). **Priority:** Next up.

The issue thread holds only the runner's usage-limit notices; the human added no answers.

## How it was read

PR-26 and `docs/method/FULLSTACK_MODULE.md` §9–§11 describe exactly these two modules, so this is a
scope addition, not a boundary change. The profile stays **A** and the only zone stays `operator`
(OD-10). Visitors still give nothing: they read a page, and their browser loads public images from
the bucket. Uploads happen only inside the zone, after the server checks the staff claim and AAL2.

No personal data from the public enters any store:
- book types are synthetic library content;
- covers are library content uploaded by staff, with all metadata (which can carry location and
  device) removed before storage;
- `book_type_covers` holds no column about a person.

So the Personal-Data Protection gate does not apply, and no `docs/PROTECTION_MODEL.md` is written.

Nothing in the request breaks a signed decision that only a new client decision could change:
- OD-04 and OD-06 (no Supabase, Firebase or Cloudflare MCP) are untouched: the builder reaches the
  stores only through local emulators, and production moves only in `devos-deploy`.
- OD-08 left the production data stores open.

## What was decided

- **OD-11** in `docs/DECISIONS.md` and amendment A-3 in `docs/SCOPE.md` §3.
- **`docs/DATA_MODEL.md`:**
  - §10: the table `public.book_type_covers`, with its checks, privileges and four named RLS policies;
  - §11: the R2 bucket (key layout, accepted types by magic bytes, the 5,242,880-byte limit, the
    re-encode, the order of replace and remove);
  - §12: the Firestore collection `book_types`, its seed and its rules.
- **`docs/adr/ADR-003-firestore-and-r2.md`:** why the pilot runs three stores (the request is for
  testing the method, not the shape a real product of this size would choose).
- **`docs/BOUNDARY_MODEL.md`:** the `devos:boundary` line adds `src/lib/r2/**` to the `operator` zone's
  source. Its URLs and `personal_data: false` are unchanged. §2 states that Firestore and the bucket are
  first-party.
- **`docs/SECURITY_MODEL.md`:** §1 lists the new keys and where they live. A new §2b adds the bucket's
  origin to CSP `img-src` and nothing else (`connect-src` stays `'self'`).
- **`docs/CONTENT_MODEL.md`** (the `BookType` entity, its glossary row and the two routes),
  **`docs/DESIGN_SYSTEM.md`** §10 (the page, `BookTypeEntry`, `BookCover`, the placeholder, the staff
  page, 15 catalogue keys per locale) and **`docs/PRODUCT_BRIEF.md`** (precedence 1: a third page and
  two stores).
- **Tasks:** seven, each leaving the product working.

  | Task | What | Risk | Why that risk |
  |---|---|---|---|
  | T19 | Firestore module: rules denying every client, 10 rules tests, server-only reader, the 5-type seed; nothing visible | 3 | rules file (human gate) |
  | T20 | Public book-types page from Firestore with the placeholder; home link | 2 | |
  | T21 | Migration `book_type_covers` with RLS and pgTAP | 3 | migration (human gate) |
  | T22 | Storage module: server-only bucket client, image check and re-encode, storage tests; nothing visible | 3 | storage keys |
  | T23 | Public page shows covers; CSP `img-src` gains the bucket origin | 3 | headers |
  | T24 | Staff cover editor: upload, replace, remove; staff home link | 3 | staff writes |
  | T25 | Whole-flow end-to-end proof and the production checklist; gate `G-Book-types` | 2 | gate |

  The Firestore module comes first because T20 makes the page visible with placeholders, before any
  storage exists. The link table (T21) comes before the storage module (T22), so each module's setup
  task does that one thing.
- **The issue's "done" tests map as follows:**
  - 5 types in sort order, in both locales, with the home link: T20, again at T25;
  - Firestore rules refuse every client: T19 (`firestore-rules`);
  - WebP with no EXIF: T22 (storage test) and T25;
  - an upload over 5 MB or of another type is refused, in both languages: T24 (e2e) and T25;
  - no upload by a visitor or by staff at AAL1: T21 (pgTAP), T24 and T25 (e2e);
  - `storage`, `firestore-seed`, `firestore-rules` and `guard:services` pass in every run once each
    module is active (from T19 and T22);
  - the production checks (upload, replace, remove; the deploy's preflight, rules and seed steps):
    the human, after the `G-Book-types` merge (OD-11 §13).
- **Settings outside the repository:** none to add. Every name OD-11 §12 needs is already in
  `devos/setup.json` (`r2-secrets`, `r2-var`, `r2-vercel`, `firebase-secrets`, `firebase-var`,
  `firebase-vercel`), so `devos-setup` reports what is missing. No `docs/setup-items.json` is written.

## Known limits

- **Hosting request-body limit.** Vercel refuses a function request body above about 4.5 MB before
  the app runs. In production, then, a file between that size and 5 MB, or above 5 MB, is refused by
  the platform with its own error, not with the app's bilingual `tooLarge` message.
  - The 5 MB limit and its message are proven in CI, where the app runs under `next start` with
    `experimental.serverActions.bodySizeLimit` (T24).
  - The production checks of OD-11 §13 use an ordinary-size image.
  - A production limit above the platform's is not decided (OD-11 "Does not decide"). If the human
    wants the bilingual message in production for any size, there are two options, each needing a
    new request: a lower limit (for example 4 MB), or a size check in the browser before the form is
    sent.
- **`r2.dev` public URLs** are rate-limited and meant for development (ADR-003). A custom domain is
  not decided.

## What was left out, and why

- **Staff editing of book types, or any app write to Firestore.** The request says the types change
  only through the seed file.
- **A Firebase web SDK, presigned or browser uploads.** Not asked for. They would widen the CSP
  (`connect-src`) and the boundary; `modules.firebase.client_sdk` stays `false`.
- **Backup or versioning of uploaded images.** `FULLSTACK_MODULE.md` §9 leaves it to the product, and
  the request does not ask for one.
- **Alt text, captions or other images.** The request makes covers decorative (`alt=""`).
- **A foreign key from `book_type_covers` to the type.** The type lives in Firestore. The staff action
  checks the id against the seed, and the pages ignore a link whose type has left the seed.
- **`docs/GLOSSARY.md`.** It is outside the intake surface (`devos.config.json` `surfaces.intake`).
  OD-11 §2 signs the `BookType` term, `docs/CONTENT_MODEL.md` §2 gives the row, and T19 S10 lands it
  word for word.

## Rehearsal

- **Guards.** `node scripts/guards/run-all.mjs` on this intake's tree, 2026-10-16: PASS for nine
  guards (`phases` `25 tasks, 18 PASS`; `i18n` `101 keys per locale`; `boundary` `…; profile A; zones:
  operator`; `data` `2 migration(s), 2 table(s), 2 with RLS`; `manual` `78 names checked`). `services`
  prints `N/A` until T19 creates `firebase.json`.
- **Counts the T19 fence relies on:**
  - Grep `^\s*(it|test)\(` over `src/**/*.test.ts`: 88 in 17 files.
  - Grep `^\s*test\(` over `e2e/`: 55 in 11 files.
- **Script outputs** were read in the source, and the fence cites them as written:
  - `scripts/devos/firebase.mjs`: the `validate`, `start` and `seed` messages;
  - `scripts/guards/services.mjs`: the note `firebase: <rules files>; seed <collection> (<n>)`;
  - `scripts/devos/run-checks.mjs`: `modules` in the order supabase, r2, firebase, and
    `all required checks passed`.
- **The second run of this intake** (2026-10-16) found that main had gained a tenth guard,
  `guard:manual` (PR-30). It added that guard to the T19 fence's P4 and D2 and its Rehearsed line.
  Nothing else had changed.
- **Not run here:** `pnpm install`, a build, the Firestore emulator and the rules test. Neither
  `node_modules` nor the Firebase CLI is on the intake runner. The T19 fence says so in its Rehearsed
  line.
