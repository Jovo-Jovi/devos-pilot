# ADR-003 — Book types in Cloud Firestore, cover images in Cloudflare R2

**Status:** Proposed with OD-11, 2026-10-13. It is accepted when the human merges the intake PR for
issue #26.
**Adds to:** ADR-002 (Supabase Postgres stays the store for notices, opening hours, staff accounts and
the link from a book type to its cover). ADR-001 still holds for `LibraryProfile`.
**Follows:** PR-26 and `docs/method/FULLSTACK_MODULE.md` §9–§11.

## Context

Issue #26 asks for a public list of book types and for staff-uploaded cover images, and says why: to
test the method's storage (R2) and Firestore modules end to end, from their first setup task to a
production deploy. Postgres could hold the book types, and Supabase Storage could hold the images; a
real product of this size would use one store. The pilot exists to test the method (PRODUCT_BRIEF),
so the request chooses the two new modules on purpose.

## Decision

- **`BookType` lives in Cloud Firestore**, collection `book_types`, read on the server only with
  `firebase-admin`. The seed `firebase/seed/book_types.json` is the source of truth; `devos-deploy`
  writes it and prunes what it no longer has, so git history is the backup. Rules deny every client.
- **Cover images live in a Cloudflare R2 bucket**, written only by staff-zone server actions after the
  staff claim and AAL2 are checked, re-encoded to WebP without metadata, under immutable keys, and
  served from the bucket's public URL.
- **The link between them** is the Postgres table `public.book_type_covers` (RLS, pgTAP), so staff
  writes go through the same claim-and-AAL2 policies as every other staff write, and the public page
  refreshes by cache tag.
- Exact shapes: `docs/DATA_MODEL.md` §10–§12.

## Consequences

- Every run starts the Firestore emulator (from T19) and a local S3 store (from T22); the required
  checks gain `firestore-seed`, `firestore-rules` and `storage`, and `guard:services` applies.
- A rules change stops at the human gate like a migration; storage, header and upload tasks are risk 3.
- Production gains two accounts, a bucket, two service accounts and their secrets (`SETUP.md` §13).
  `devos-deploy` runs the storage preflight, then the database, then the Firestore rules and seed, then
  the app.
- The book-types list renders at request time behind tag-cached reads, so the build needs no Firestore
  credential.
- Uploaded images have no backup (OD-11 does not decide one). `r2.dev` URLs are rate-limited and meant
  for development; a real product would connect a custom domain.
- Three stores raise the setup and failure surface. A later product decision may fold book types into
  Postgres; that would be a new OD and a data move with counts before and after.
