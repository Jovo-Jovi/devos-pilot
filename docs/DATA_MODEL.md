# PILOT — Data model (backend module)

Precedence 7. This model was written at intake for issue #14 and is adopted by OD-10 (DRAFT until the
intake PR merges). For `LibraryNotice` and `OpeningSlot` it supersedes ADR-001 (ADR-002).
- **Store:** Supabase Postgres.
- **How the schema changes:** only by forward-only migrations in `supabase/migrations/` (PR-17).
  Every rule below is proven by pgTAP in `supabase/tests/` on every run.
- **Scope:** a table, column, policy or grant that is not in this document is out of scope.

## 1. Principals

| Principal | Postgres role | Recognised by |
|---|---|---|
| Anonymous visitor, and the public pages' server reads | `anon` | the publishable key, no session |
| Signed-in account without the staff claim | `authenticated` | a session whose `app_metadata.staff` is absent or not JSON `true` |
| Staff at AAL1 (password only) | `authenticated` | `app_metadata.staff` is JSON `true` and `aal` is `aal1` |
| Staff at AAL2 (password and TOTP) | `authenticated` | `app_metadata.staff` is JSON `true` and `aal` is `aal2` |
| Migrations, `devos-deploy`, test fixtures | `postgres` (and `service_role`, which no app code uses) | the CLI or the deploy job |

- **Where the staff claim lives.** It is read from `app_metadata`, which only the service role can
  write: the human, in the hosted project's SQL editor (§5).
- **What is never trusted.** `user_metadata` is never trusted, because the account itself can write it.
  A string `"true"` is not the claim either.

## 2. Tables

The database columns are the snake_case forms of the `CONTENT_MODEL.md` §2 fields. No table has an
author, editor or other attribution column, and no column holds anything about a person (Profile A,
handbook §8 `guard:schema`). Every table is owned by `postgres`, the migrations' role.

### 2.1 `public.library_notices` (`LibraryNotice`)

| Column | Type | Rule | Content field |
|---|---|---|---|
| `id` | `text` primary key, default `gen_random_uuid()::text` | `~ '^[a-z0-9]+(-[a-z0-9]+)*$'` (kebab-case; a uuid's text form passes) | `id` |
| `status` | `text not null`, default `'draft'` | `in ('published', 'draft')` | `status` |
| `published_on` | `date not null` | the sort key, newest first | `publishedOn` |
| `title_ar`, `title_en` | `text not null` | `btrim(…) <> ''` | `titleAr`, `titleEn` |
| `body_ar`, `body_en` | `text not null` | `btrim(…) <> ''` | `bodyAr`, `bodyEn` |

### 2.2 `public.opening_slots` (`OpeningSlot`)

| Column | Type | Rule | Content field |
|---|---|---|---|
| `id` | `text` primary key, default `gen_random_uuid()::text` | kebab-case, as above | `id` |
| `day_of_week` | `smallint not null` | `between 0 and 6`; 0 = Sunday | `dayOfWeek` |
| `opens_at`, `closes_at` | `text not null` | `~ '^([01][0-9]\|2[0-3]):[0-5][0-9]$'`; `opens_at collate "C" < closes_at collate "C"` | `opensAt`, `closesAt` |
| `note_ar`, `note_en` | `text`, nullable | each null or not blank; `(note_ar is null) = (note_en is null)` | `noteAr`, `noteEn` |

`LibraryProfile` is not in the database. It stays in `content/library-profile.json` (ADR-001).

## 3. Privileges and RLS, per role

**Privileges.** Both tables have row level security enabled in the migration that creates them. Their
privileges are set explicitly:
1. `revoke all … from anon, authenticated`;
2. then the grants below.

The platform's default privileges never decide who may write. No grant of `insert`, `update`,
`delete`, `truncate` or `all` is ever made to `anon` (`guard:data`).

| Table | `anon` | `authenticated` |
|---|---|---|
| `library_notices` | `select` | `select`, `insert`, `update` (no `delete`) |
| `opening_slots` | `select` | `select`, `insert`, `update`, `delete` |

**Policies** (exact names; `pgTAP policies_are` pins them):

| Policy | Table | Command | Roles | Expression |
|---|---|---|---|---|
| `library_notices_select_published` | `library_notices` | select | `anon`, `authenticated` | `using (status = 'published')` |
| `library_notices_select_staff` | `library_notices` | select | `authenticated` | `using ((select private.is_staff_aal2()))` |
| `library_notices_insert_staff` | `library_notices` | insert | `authenticated` | `with check ((select private.is_staff_aal2()))` |
| `library_notices_update_staff` | `library_notices` | update | `authenticated` | `using` and `with check` `((select private.is_staff_aal2()))` |
| `opening_slots_select_all` | `opening_slots` | select | `anon`, `authenticated` | `using (true)` |
| `opening_slots_insert_staff` | `opening_slots` | insert | `authenticated` | `with check ((select private.is_staff_aal2()))` |
| `opening_slots_update_staff` | `opening_slots` | update | `authenticated` | `using` and `with check` `((select private.is_staff_aal2()))` |
| `opening_slots_delete_staff` | `opening_slots` | delete | `authenticated` | `using ((select private.is_staff_aal2()))` |

**Who can do what** (what the pgTAP test proves):

| Who | `library_notices` | `opening_slots` |
|---|---|---|
| `anon` | reads published rows only; insert, update and delete refused (no privilege) | reads every row; writes refused (no privilege) |
| Signed in, no staff claim | reads published rows only; insert refused (RLS); update matches no row; delete refused (no privilege) | reads every row; insert refused (RLS); update and delete match no row |
| Staff at AAL1 | as the row above | as the row above |
| Staff at AAL2 | reads every row, drafts included; inserts and updates (publish = `status` to `'published'`, unpublish = back to `'draft'`); delete refused (no privilege): nobody deletes a notice | reads, inserts, updates and deletes |

**What anonymous visitors may read:** published notices and every opening slot, and (OD-11) every
row of `book_type_covers` (§10). Nothing else in `public`. They can write nothing.

## 4. Functions

`private.is_staff_aal2() returns boolean` is `language sql`, `stable`, `security invoker` and
`set search_path = ''`. Its body:

```sql
select coalesce((auth.jwt() -> 'app_metadata' -> 'staff') = 'true'::jsonb, false)
   and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
```

- **Grants.** `execute` is revoked from `public` and granted to `authenticated`, and `usage` on the
  schema `private` is granted to `authenticated`.
- **Exposure.** The `private` schema is not exposed by the Data API, and no table is created in it.

## 5. Accounts (Supabase Auth, the `auth` schema)

- **Sign-up is off.** Accounts exist only by invitation. The local and CI test accounts exist only in
  `supabase/seed.sql`, on reserved domains (T14).
- **Inviting a staff member** (the human, in the hosted project):
  1. Authentication → Users → **Invite user** with the address.
  2. Right after that, in the SQL editor:
     `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"staff": true}'::jsonb where email = '<invited address>';`
  3. Only then does the staff member open the invitation.

  The address never enters the repository.
- **Revoking.**
  `update auth.users set raw_app_meta_data = raw_app_meta_data - 'staff' where email = '<address>';`
  It takes effect when the session's token next refreshes: at most `jwt_expiry` later, one hour by
  default. Deleting the account in the dashboard also works, and loses nothing, because no table
  refers to an account.
- **The invitation link.** The hosted project's invite template links to
  `{{ .SiteURL }}/ar/staff/auth/confirm?token_hash={{ .TokenHash }}&type=invite` (the route lands at
  T15). The Site URL is the production URL. The route redirects at once to a URL without the token.
- **TOTP.** The factor is enrolled at the first sign-in. If a staff member loses it, the human deletes
  the factor in the dashboard, and the staff member enrols a new one at the next sign-in.
- **Password recovery** is not in scope (OD-10). The human deletes the account and invites again.
- **What the zone keeps about staff:** an email address, a password hash and a TOTP factor, all in
  `auth` and nowhere else. It keeps nothing about visitors.

## 6. Clients and keys (`src/lib/supabase/`, inside the `operator` zone)

| File | Export | Library | Key | Session |
|---|---|---|---|---|
| `env.ts` | `supabasePublicEnv()`, `checkSupabasePublicEnv()` | — | reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | — |
| `public.ts` | `createPublicReadClient()` | `@supabase/supabase-js` | publishable | none: no cookie, no persistence (the public pages' server reads, T13) |
| `server.ts` | `createStaffServerClient()` | `@supabase/ssr` | publishable | the staff session cookies; first line `import "server-only";` (zone pages, actions and the confirm route, T14 to T17) |

- **No browser client.** The browser never calls Supabase, so the CSP `connect-src` stays `'self'`.
- **No secret-key client.** No request in scope needs an admin call (OD-10 §7).
- **Environment names.** They are fixed in `devos.config.json` `modules.supabase.env`.
  `SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL` and `SUPABASE_MAIL_URL` are for tests and the reviewer only.

## 7. Generated types

After every migration, run
`supabase gen types typescript --local > src/lib/supabase/database.types.ts`, and never edit the
output by hand.
- The file exports `Database`. Row types are read as
  `Database["public"]["Tables"]["library_notices"]["Row"]` (or the generated `Tables<"…">` helper).
- Rows are mapped to the existing `LibraryNotice` and `OpeningSlot` types (`src/content/schema.ts`).
  Components never see row types.
- The `types` check fails when the file differs from a fresh generation (PR-17).

## 8. Seeds and tests

- **The seed.** `supabase/seed.sql` is synthetic and local only: `supabase db push` never runs it, so
  nothing in it reaches the hosted project. It uses reserved email domains only (`guard:data`). At T11
  it has no rows. T14 adds the synthetic staff test accounts.
- **The content.** The content rows reach every database, local, CI and production alike, through the
  T12 migration. They never come from the seed.
- **The pgTAP tests.** They live in `supabase/tests/database/`:
  - `library_content_rls.test.sql` (T11) proves §3 for every principal of §1;
  - `library_content_move.test.sql` (T12) proves the moved rows.

## 9. Migrations (forward-only, expand-then-contract)

| Migration (`<14-digit timestamp>_<name>.sql`) | Task | What it does |
|---|---|---|
| `…_create_library_content.sql` | T11 | the schema `private` and `private.is_staff_aal2()`; both tables; privileges; RLS; the eight policies |
| `…_move_library_content.sql` | T12 | inserts the 4 notices and 7 opening slots of `content/*.json`, `on conflict (id) do nothing` |
| `…_create_book_type_covers.sql` | T21 | `public.book_type_covers`; privileges; RLS; its four policies (§10) |

A migration that has reached `main` is never edited, renamed or deleted (`guard:data`). The production
order is backup, then migrations, then the app (PR-18).

---

The sections below were written at intake for issue #26 and are adopted by OD-11 (DRAFT until that
intake PR merges). The product then has three stores (ADR-003): Supabase Postgres (§1–§10), Cloudflare
R2 object storage (§11) and Cloud Firestore (§12).

## 10. `public.book_type_covers` (the link from a `BookType` to its cover)

One row per book type that has a cover. A type without a row shows the placeholder. The table holds no
column about a person.

| Column | Type | Rule |
|---|---|---|
| `book_type_id` | `text` primary key | `~ '^[a-z0-9]+(-[a-z0-9]+)*$'` (the Firestore document id, §12) |
| `object_key` | `text not null unique` | `~ '^book-types/[a-z0-9]+(-[a-z0-9]+)*/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$'`, and `starts_with(object_key, 'book-types/' \|\| book_type_id \|\| '/')` |

- **No foreign key.** The type lives in Firestore. The staff action checks the id against the seeded
  types before it writes; a row whose type later leaves the seed is ignored by the pages.
- **Privileges.** RLS enabled in the creating migration; `revoke all … from anon, authenticated`;
  then `anon`: `select`; `authenticated`: `select`, `insert`, `update`, `delete`.
- **Policies** (exact names; pgTAP `policies_are` pins them):

| Policy | Command | Roles | Expression |
|---|---|---|---|
| `book_type_covers_select_all` | select | `anon`, `authenticated` | `using (true)` |
| `book_type_covers_insert_staff` | insert | `authenticated` | `with check ((select private.is_staff_aal2()))` |
| `book_type_covers_update_staff` | update | `authenticated` | `using` and `with check` `((select private.is_staff_aal2()))` |
| `book_type_covers_delete_staff` | delete | `authenticated` | `using ((select private.is_staff_aal2()))` |

- **Who can do what** (the pgTAP proof, T21): `anon` reads every row and cannot write (no privilege);
  signed in without the claim, and staff at AAL1, read every row, insert is refused (RLS), update and
  delete match no row; staff at AAL2 read, insert, update and delete.
- **Reads.** The public page reads `book_type_id, object_key` with `createPublicReadClient()` through a
  `'use cache'` reader tagged `book-type-covers` (`cacheLife("minutes")`). Staff writes use
  `createStaffServerClient()` and call `updateTag("book-type-covers")`.
- **Types.** `Database["public"]["Tables"]["book_type_covers"]["Row"]`, regenerated by T21 (§7).

## 11. Object storage (Cloudflare R2): cover images

- **Bucket.** One bucket, named by `R2_BUCKET`; locally and in CI the throwaway S3 store of
  `scripts/devos/r2.mjs` (bucket `devos-test`). Public read through `R2_PUBLIC_BASE_URL` (r2.dev for the
  pilot). Nothing else is stored in it.
- **Key layout.** `book-types/<book type id>/<uuid v4>.webp`. A key is never reused or overwritten: a
  replacement gets a new key. Objects are written with `Content-Type: image/webp` and
  `Cache-Control: public, max-age=31536000, immutable`.
- **Who uploads.** Only a staff-zone server action, after the server checks the staff claim and AAL2.
  Visitors never upload. There is no presigned or browser upload (`connect-src` stays `'self'`).
- **What is accepted.** JPEG (`FF D8 FF`), PNG (`89 50 4E 47 0D 0A 1A 0A`) or WebP (`RIFF` … `WEBP` at
  bytes 8–11), recognised by the first bytes, never by the name or the browser's type; at most
  5 MB = 5 × 1024 × 1024 = 5,242,880 bytes; it must also decode. Anything else is refused with
  `tooLarge` or `wrongType`, in the staff member's language.
- **What is stored.** `sharp`: apply the EXIF orientation, resize to at most 1200 px wide without
  enlarging, encode WebP; **all metadata removed** (never `withMetadata` or `keepMetadata`).
- **How the database points at it.** `book_type_covers.object_key` (§10); the URL is
  `${R2_PUBLIC_BASE_URL}/${object_key}`.
- **Order of a replace.** Put the new object → upsert the link → delete the old object. If the upsert
  fails, delete the new object and report `save`. **Remove:** delete the link → delete the object. An
  object whose delete fails is left orphaned and does no harm (nothing points at it).
- **Code.** `src/lib/r2/`, every file `import "server-only";` (`.cursor/rules/71-r2.mdc`,
  `guard:services`). Environment names: `devos.config.json` `modules.r2.env_names`.
- **Backup.** None: uploaded images are content, not code (`FULLSTACK_MODULE.md` §9; OD-11 does not
  decide one).

## 12. Cloud Firestore: `book_types`

- **Collection `book_types`.** Document id = the `BookType` `id` (kebab-case). Fields:

| Field | Type | Rule |
|---|---|---|
| `nameAr`, `nameEn` | string | bilingual pair, both required, not blank |
| `descriptionAr`, `descriptionEn` | string | one line each, both required, not blank |
| `sortOrder` | integer ≥ 0 | the list order, ascending; ties by `id` |

  A document with a missing, blank, extra or mistyped field is skipped (and counted), never rendered.
- **Seed.** `firebase/seed/book_types.json`: an array of 5 synthetic documents, each with `id` and
  the five fields. It is the source of truth: `devos-deploy` writes it after the human's merge and
  removes documents the file no longer has (`modules.firebase.seed_prune`). Count check:
  `node scripts/devos/firebase.mjs validate` → `seed valid: book_types (5)`.
- **Who reads.** The server only, with `firebase-admin` (`src/lib/firebase/`, every file
  `import "server-only";`). Locally the emulator (`FIRESTORE_EMULATOR_HOST`, project `demo-devos`, no
  credential); in production `FIREBASE_PROJECT_ID` and the read-only `FIREBASE_SERVICE_ACCOUNT`.
  Nobody writes from the app.
- **Rules.** `firestore.rules` denies every client: `allow read, write: if false;` on every document,
  proven by `firebase/firestore.rules.test.ts` (`test:rules`, the `firestore-rules` check). The admin
  SDK is not governed by rules.
- **Reads on the page.** `'use cache'`, tagged `book-types`, `cacheLife("hours")`, at request time
  (OD-11 §4). The seed changes only with a deploy.
