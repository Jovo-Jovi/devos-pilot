# PILOT — Decisions

Precedence 2, with `SCOPE.md`. A signed OD is never edited; a later OD amends it.
**Basis of signature for OD-01 to OD-06:** the human's push of the bootstrap commit to `main` is
the confirming act (2026-10-10).

---

### OD-01 — Pilot purpose, profile and boundary gate
**Status:** SIGNED — 2026-10-10 (bootstrap push)
**Amends:** none
**Requested by:** Jiovanny, 2026-10-10
**1.** PILOT is a test project for running Dev OS v2 as an automated builder/reviewer cycle.
**2.** Profile **A** (public bilingual site). No dashboard, no accounts.
**3.** The **Boundary gate is non-waivable**: no form, input, cookie, storage, tracker, analytics
script, log or route handler accepts or keeps visitor data.
**4.** No domain gate (no clinical, legal or regulated content).
**Does not decide:** deployment, domain, hosting plan.

### OD-02 — The human stands in for the client
**Status:** SIGNED — 2026-10-10 (bootstrap push)
**1.** The client is fictional. The human signs every client-signed gate (G-Scope, G-Design).
**2.** `DESIGN_SYSTEM.md` as committed in the bootstrap is the **approved design** (G-Design PASS).
**3.** The synthetic files in `content/` are the client's signed content for the pilot.
**Does not decide:** any real client engagement.

### OD-03 — Automated relay (amends Dev OS v2 §2 "the loop" for this project)
**Status:** SIGNED — 2026-10-10 (bootstrap push)
**Amends:** Dev OS v2 §2 loop, §5.5 verdict recording, §6.3 "the human opens and merges the PR"
**1.** The runner (`.github/workflows/devos-cycle.yml`, or `scripts/devos/loop.mjs` locally)
replaces the human as the relay: it hands the fence to the builder, commits and pushes the task
branch `task/Tnn`, opens the PR, runs the checks, hands the branch to the reviewer, validates the
verdict, and records it in `docs/PHASES.md`.
**2.** The reviewer still never writes code: it may change only `docs/reviews/**` and
`docs/fences/**`. The builder may not change the method surfaces listed in `devos.config.json`
`surfaces.builder.deny`. `scripts/devos/guard-surfaces.mjs` enforces both after every run.
**3.** **Auto-merge** only when all hold: verdict PASS · required checks green · risk 1 or 2 ·
the task's `Gate` cell is `—`.
**4.** **Human gate**: a PASS on a risk-3 task or on a task that closes a station gate stops the
cycle with the PR open and labelled `devos:human-gate`. The human's merge is the sign-off and
restarts the cycle.
**5.** A FAIL is retried with the reviewer's reissued fence, up to `max_attempts` (3). After that
the PR is labelled `devos:halted` and the cycle stops.
**6.** Kill switch: repository variable `DEVOS_PAUSED=true` stops the runner before any agent call.
**7.** A red required check turns a PASS into a FAIL, mechanically (PR-08).
**Does not decide:** a cycle for a real client project; that needs its own OD.

### OD-04 — Repository visibility
**Status:** SIGNED — 2026-10-10 (bootstrap push)
**1.** The repository is **private**. The reviewer verifies from the checked-out branch in the
runner, which satisfies "fetch, never paste".

### OD-05 — Models
**Status:** SIGNED — 2026-10-10 (bootstrap push)
**1.** Builder for every task: **Grok 4.7 in Cursor** (`grok-4.7`, effort high, which is its
default), through the Cursor CLI `agent`.
**2.** Reviewer: **Claude Sonnet 5.5** for risk 1–2; **Claude Opus 5.5** (heavyweight) for risk 3
and for every task that closes a station gate.
**3.** Model ids live in `devos.config.json`; changing them is a D-row, not an OD.

### OD-06 — Tooling from the Cursor marketplace review
**Status:** SIGNED — 2026-10-10 (bootstrap push)
**1.** Builder MCP servers: **Context7** (read-only documentation lookups) in every run;
**Playwright MCP** in the IDE only (rendered evidence). Nothing else.
**2.** Omitted, with reasons in `docs/method/DEVOS_FIT.md` §7a: PostHog, Sentry, Supabase,
Vercel, GitHub (for the builder), Superpowers, marketplace automations.
**3.** A connected tool is not permission. A fence names the calls it allows.

### OD-07 — Design v2 ("Reading-room timetable") replaces the pilot design
**Status:** SIGNED — by the human's push of the commit that lands this OD
**Amends:** OD-02 §2 (the approved design)
**Requested by:** Jiovanny, 2026-10-10 ("the UI is so bad")
**1.** `docs/design/DESIGN_SYSTEM.v2.md` and `docs/design/mockup.html` are the approved design (G-Design
PASS for v2). They supersede `docs/DESIGN_SYSTEM.md` §1–§5.
**2.** The redesign is built through the method: a change request issue, an intake PR that moves v2 into
`docs/DESIGN_SYSTEM.md` and plans the tasks, then the cycle. The last redesign task closes gate
`G-Design-v2`, signed by the human's merge.
**3.** UI tasks get a visual check: the reviewer reads full-page screenshots at 1280px and 390px and
compares them with the approved design; a visible departure is a FAIL.
**Does not decide:** new content, new pages, or any data collection (the Boundary gate stands).

### OD-08 — Automation v3
**Status:** SIGNED — by the human's push of the commit that lands this OD
**Amends:** OD-03, OD-05 §1
**1. Builder effort.** The reviewer chooses Grok 4.7 effort (`low | medium | high | xhigh`) and Cursor
Fast mode (`yes | no`) per task in the fence header line `- Builder: grok-4.7 · Effort: … · Fast: …`.
`scripts/devos/builder-model.mjs` resolves the Cursor model id and checks it against `agent models`,
falling back to `builder.model`. A workflow input can override both for one run.
**2. Vercel.** When the repository variable `DEVOS_VERCEL` is `true`, every task attempt gets a Vercel
preview whose URL is posted on the PR and given to the reviewer. Production deploys run on pushes to
`main` made by a person (gate merges) and on demand (`devos-deploy`). Git-triggered Vercel deploys are
off (`vercel.json`).
**3. Change requests.** New work enters as a GitHub issue (form "Dev OS change request"). The reviewer
answers with an intake PR (draft OD, scope amendment, task rows, first fence), questions, or a reasoned
refusal. Merging the intake PR signs its OD and starts the tasks. On an open task PR, a comment
`/devos revise <change>` makes the reviewer reissue that task's fence with the change as the next
attempt's focus; a human revision may exceed `max_attempts`. Only owners, members and collaborators
can trigger either. Intake and revise runs have their own edit surfaces in `devos.config.json`.
**4. Usage limits.** The reset time is read from the agent's message. Waits up to
`resume.inline_wait_max_minutes` (330) are slept through by the cycle's `wait-and-resume` job, which
then re-dispatches the task; longer waits fall to `devos-resume` (every 2 hours, best effort) or a
manual run. Removing the `devos:quota-wait` label cancels a wait.
**5. Screenshots.** Each attempt saves screenshots for the reviewer's visual check (OD-07 §3).
**Does not decide:** custom domains, DNS, or any production data store.

### OD-09 — Build design v2 on the home and notices pages
**Status:** DRAFT — signed when the human merges the intake PR
**Amends:** none (executes OD-07 §2)
**Requested by:** issue #7
**1.** Design v2 is built on `/[locale]` and `/[locale]/notices` in both locales: the v2 tokens and
faces (Reem Kufi, Readex Pro, self-hosted by `next/font`), the reading-room `Timetable`, the open-now
`StatusChip` and `TodayLine`, and date-stamped `NoticeEntry` lists. `docs/design/DESIGN_SYSTEM.v2.md`
is moved into `docs/DESIGN_SYSTEM.md` with the intake clarifications in its §8.
**2.** The work is four tasks, T07 to T10 (`docs/PHASES.md`), each leaving the product working. T10
closes gate `G-Design-v2` (OD-07 §2), signed by the human's merge after the visual check (OD-07 §3).
**3.** The pages stay statically prerendered. Everything that depends on the current time is computed
on the client after hydration in the fixed zone `Africa/Cairo`; it reads only the clock and stores or
sends nothing. The Boundary gate (OD-01 §3) is unchanged and applies to every task.
**4.** No content, route, header, dependency or data store changes. The only new runtime code paths
are presentational components and pure time functions with unit tests.
**5.** "Done" for the request is the issue's own test: the screenshots of `/ar`, `/en`, `/ar/notices`,
`/en/notices` at 1280px and 390px match the approved design, and every required check passes.
**Does not decide:** new content or pages; phone-number formatting; removing `site.tagline` from the
catalogues; CF-005 (it becomes moot when T07 lands the v2 link colour; its closure is recorded by T10);
any other carry-forward.

### OD-10 — Staff editor on Supabase: the `operator` zone
**Status:** DRAFT — signed when the human merges the intake PR
**Amends:** OD-01 §2 ("No dashboard, no accounts"). OD-01 §3 stays non-waivable outside the zone.
Supersedes ADR-001 and D-01 for `LibraryNotice` and `OpeningSlot` (ADR-002). Decides the production
data store that OD-08 left open. OD-04 (private repository) and OD-06 (no Supabase MCP) are unchanged.
**Requested by:** issue #14
**1. Profile and zone.** The profile stays **A**. One zone opens, `operator`. Its source is
`src/app/[locale]/staff/**`, the Supabase client code `src/lib/supabase/**` and the session proxy
`src/proxy.ts`. Its URLs are `/[locale]/staff/**`, and it holds no personal data (`personal_data: false`).
The `devos:boundary` line in `docs/BOUNDARY_MODEL.md` says exactly this (PR-19). Inside the zone, these
are allowed: forms and inputs, the Supabase Auth session cookies, server actions, and one route handler
(the invitation link, T15). Outside the zone, OD-01 §3 holds in full. Public responses set no cookie,
and visitors keep giving nothing. Analytics and third-party scripts are allowed nowhere.
**2. No personal data from the public.** The zone holds none. Staff accounts (email address, password
hash, TOTP factor) live only in Supabase Auth's `auth` schema. No `public` table has a column about a
person: there is no author or attribution column. So the Personal-Data Protection gate (handbook §10.3)
does not apply and no `docs/PROTECTION_MODEL.md` is written. A zone with personal data needs its own OD.
**3. Accounts by invitation only.** Public sign-up is off, both in `supabase/config.toml` and in the
hosted project. The human invites staff from the Supabase dashboard and grants the staff claim
`app_metadata.staff = true` with the statement in `docs/DATA_MODEL.md` §5. Real addresses never enter
the repository. There is no in-app invitation, account management or password recovery.
**4. Sign-in (handbook §9).** Staff sign in with email and password, then a TOTP code. A staff member
enrols the TOTP factor at the first sign-in. Every staff page after sign-in, and every write, needs
the staff claim and AAL2. The app checks both on the server, and every RLS policy checks them again
(`private.is_staff_aal2()`).
**5. Data.** `LibraryNotice` and `OpeningSlot` move to `public.library_notices` and
`public.opening_slots` in Supabase Postgres, as specified in `docs/DATA_MODEL.md`, which this OD adopts
at precedence 7. Anonymous visitors read published notices and every opening slot. Staff at AAL2 can
create, edit, publish and unpublish notices, but cannot delete them. They can add, change and remove
opening slots. `LibraryProfile` stays in `content/library-profile.json`. The content moves by its own
migration (T12), and its row counts must equal the JSON: 4 notices (3 published, 1 draft) and 7
opening slots. From T13 on, the app no longer reads `content/library-notices.json` and
`content/opening-slots.json`. They stay in the tree as the record of the signed content that moved
(OD-02 §3).
**6. Public pages.** The routes and the rendering stay the same: the pages must look exactly as they do
now, which the visual check verifies. They read published rows on the server, with the publishable
key and no session, through cache entries tagged `library-notices` and `opening-slots`. A staff write
invalidates its tag, so the pages update without a redeploy. The browser never calls Supabase, and the
CSP `connect-src` stays `'self'`. Staff routes alone get `form-action 'self'` (`docs/SECURITY_MODEL.md`
§2a). Every other header is unchanged.
**7. Keys.** The app uses only the Supabase URL and the publishable key. There is no browser client and
no secret-key (service-role) client: nothing in this request needs an admin call. `SUPABASE_SECRET_KEY`
stays out of Vercel. Tests may use the local stack's throwaway secret key (`.devos/supabase.env`).
**8. Design.** `docs/DESIGN_SYSTEM.md` §9 is the approved design for the staff pages (OD-02 §1: the
human signs it by merging). The staff pages add no token, colour or face.
**9. Tasks and gates.** The work is eight tasks, T11 to T18 (`docs/PHASES.md`), and each one leaves the
product working. T11 and T12 add migrations, so they are risk 3 and stop at the human gate (PR-17).
T14 to T16 (auth, headers, the first write path) are risk 3 too. T18 runs the whole zone end to end
against the CI database and closes gate `G-Staff-editor`, signed by the human's merge.
**10. Production (the human's part).** Before the first production deploy that carries a migration, the
human:
- creates the hosted project (`SETUP.md` §12.1) and confirms that its Postgres major version equals
  `[db] major_version` in `supabase/config.toml`;
- sets the GitHub secrets and `DEVOS_SUPABASE=true` (§12.2);
- sets the Vercel Production values `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and **not** `SUPABASE_SECRET_KEY` (§7 above);
- in the hosted project's Auth settings: turns sign-up off, enables TOTP, sets the Site URL to the
  production URL, and sets the invitation template link in `docs/DATA_MODEL.md` §5.

`devos-deploy` then takes the encrypted backup, applies the migrations and only then deploys the app
(PR-18).
**11. Done.** The request is done when the issue's own tests hold:
- In CI, by T11 to T18: a pgTAP test in `supabase/tests/` proves that an anonymous visitor never sees
  an unpublished notice, and that writes without the staff claim and AAL2 are refused. Every required
  check passes, `db`, `db-test` and `types` included. The public pages look exactly as they do now.
- On production, checked by the human after the `G-Staff-editor` merge:
  - an invited staff account signs in with the second factor;
  - a notice published there appears on `/ar/notices` and `/en/notices` without a redeploy;
  - the `devos-deploy` log shows the encrypted backup, then the migrations, then the app.
**Does not decide:**
- a member or visitor area, or any personal data from the public;
- in-app invitations, staff roles beyond the one claim, password recovery, account deletion;
- deleting notices;
- moving `LibraryProfile`;
- removing the two JSON files (`content/**` is outside the builder's surface; the human decides);
- media, search or a preview database (`DEVOS_PREVIEW_DB`);
- a nonce-based CSP (CF-001);
- a `docs/GLOSSARY.md` term for the staff account (that file is outside the intake surface; see
  `docs/requests/issue-14.md`).

### OD-11 — Book types from Firestore, with staff cover images in Cloudflare R2
**Status:** DRAFT — signed when the human merges the intake PR
**Amends:** OD-10 §1 (the `operator` zone gains the storage code `src/lib/r2/**` and one staff page),
OD-10 §7 (the app gains two server-only credentials: the R2 keys and a read-only Firestore key) and
OD-10 "Does not decide" (media). OD-08 left the production data stores open, and OD-10 decided
Supabase; this OD adds two more stores (ADR-003). OD-01 §3 stays non-waivable outside the zone, and
OD-04 and OD-06 (no Supabase, Firebase or Cloudflare MCP) are unchanged.
**Requested by:** issue #26
**1. Purpose.** The pilot gains the storage (R2) and Firestore modules of PR-26, to test them end to
end through the cycle, from their first setup task to a production deploy (ADR-003 records that a real
product would rarely run three stores).
**2. New entity `BookType`** (نوع الكتب): one kind of book the library holds, with an `id`
(kebab-case), a name and a one-line description in Arabic and English, and a sort order. The row for
`docs/GLOSSARY.md` §1 is given in `docs/CONTENT_MODEL.md` §2; T19 lands it word for word (the
glossary is outside the intake surface, and this OD signs the term).
**3. Book types live in Cloud Firestore**, collection `book_types`, as `docs/DATA_MODEL.md` §12 says.
The synthetic seed `firebase/seed/book_types.json` holds exactly 5 types and is their source of truth.
They change only by editing that file through a change request; `devos-deploy` writes it to Firestore
after the human's merge and removes documents the file no longer has (PR-26). Staff do not edit types,
and the app never writes to Firestore. The app reads Firestore on the server only, with
`firebase-admin`; the browser never talks to Firebase, there is no Firebase web SDK in the app and no
analytics. `firestore.rules` denies every client, proven against the emulator; a change to it stops at
the human gate (PR-26).
**4. Public page `/[locale]/book-types`**, both locales, linked from the home page. It lists the
types in sort order, each with its name, its one-line description and its cover when one is set, or
the placeholder of `docs/DESIGN_SYSTEM.md` §10 when none is. The page frame is static; the list is read
on the server at request time through tag-cached reads (`book-types`, `book-type-covers`), so the
build needs no Firestore credential. Covers sit beside the type's name and are decorative (`alt=""`).
**5. Cover images in Cloudflare R2**, as `docs/DATA_MODEL.md` §11 says. Uploads happen only in a
staff-zone server action, after the server checks the staff claim and AAL2 (OD-10 §4):
- JPEG, PNG or WebP, recognised by the file's first bytes, up to 5 MB (5 × 1024 × 1024 bytes), checked
  on the server; anything else is refused with a message in the staff member's language;
- re-encoded with `sharp` to WebP at most 1200 px wide, with **all metadata removed**, stored under a
  new immutable key `book-types/<book type id>/<uuid>.webp`;
- the old object is deleted after the database points at the new one, on replace and on remove.
Visitors never upload anything.
**6. The link from a type to its image** lives in Supabase, table `public.book_type_covers`
(`docs/DATA_MODEL.md` §10): anonymous visitors read it, staff at AAL2 insert, update and delete it,
proven by pgTAP. A staff write invalidates the tag `book-type-covers`, so the public page shows the new
cover without a redeploy.
**7. Staff page `/[locale]/staff/book-types`** lists every type with its cover or the placeholder, and
lets staff upload, replace or remove the cover of each. The staff home links to it. It composes
`docs/DESIGN_SYSTEM.md` §9 and §10 and adds no token, colour or face.
**8. Zone and boundary.** The `operator` zone's source gains `src/lib/r2/**`; its URLs and
`personal_data: false` are unchanged (`docs/BOUNDARY_MODEL.md`). Cover images are library content,
not personal data, and their metadata (which can carry location and device) is removed before storage.
Firestore and the R2 bucket are the product's own stores, not third parties: Firestore is reached from
the server only, and the bucket serves public images. Public responses still set no cookie.
**9. Headers.** The CSP `img-src` gains the origin of `R2_PUBLIC_BASE_URL`, read at build time
(`docs/SECURITY_MODEL.md` §2b); every other directive is unchanged, `connect-src` included (no
browser upload to the bucket). Server actions accept request bodies large enough for a 5 MB file.
**10. Keys.** The app reads `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` and
`R2_PUBLIC_BASE_URL`, and `FIREBASE_PROJECT_ID` with `FIREBASE_SERVICE_ACCOUNT` (a read-only key), only
in `server-only` modules (`guard:services`). `SUPABASE_SECRET_KEY` stays out of Vercel (OD-10 §7).
**11. Tasks and gates.** Seven tasks, T19 to T25 (`docs/PHASES.md`), each leaving the product working:
T19 sets up the Firestore module and T22 the storage module, each with nothing visible. T19 (rules
file), T21 (migration), T22 (storage keys), T23 (headers) and T24 (staff writes) are risk 3 and stop at
the human gate. T25 runs the whole flow end to end and closes gate `G-Book-types`, signed by the
human's merge.
**12. Production (the human's part, by name only; steps in `SETUP.md` §13).** Before the first
production deploy that carries these modules, the human:
- creates the Cloudflare account, the bucket with public access (r2.dev for the pilot) and an API token
  for that bucket only (§13.1);
- creates the Firebase project with Analytics off, the Firestore database, and the two service accounts
  `devos-deploy` (Firebase Admin) and `devos-runtime` (Cloud Datastore Viewer) (§13.2);
- sets the GitHub secrets `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
  `R2_PUBLIC_BASE_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_DEPLOY_SERVICE_ACCOUNT`, and the variables
  `DEVOS_R2=true` and `DEVOS_FIREBASE=true` (§13.3);
- sets the Vercel Production variables `R2_ENDPOINT`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`,
  `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` (both Sensitive), `FIREBASE_PROJECT_ID` and
  `FIREBASE_SERVICE_ACCOUNT` (Sensitive, the `devos-runtime` key) (§13.4).

`devos/setup.json` already lists every one of these, so `devos-setup` reports what is missing.
`devos-deploy` then runs the storage preflight, the backup and the migration, the Firestore rules and
the seed, and only then the app (PR-18, PR-26).
**13. Done.** The request is done when the issue's own tests hold:
- In CI, by T19 to T25: `/ar/book-types` and `/en/book-types` list the 5 seeded types in sort order, in
  the right language and direction, and the home page links to them in both locales; an upload over
  5 MB or of another type is refused with a message in both languages; the stored object is WebP with
  no EXIF; anonymous visitors and staff at AAL1 cannot upload or write the link (e2e and pgTAP); the
  Firestore rules refuse every client (`firestore-rules`). Every required check passes, `storage`,
  `firestore-seed`, `firestore-rules` and `guards` (with `guard:services`) included.
- On production, checked by the human after the `G-Book-types` merge: a cover uploaded by staff shows on
  the public page within a minute; replacing it shows the new one; removing it shows the placeholder;
  the `devos-deploy` log shows the storage preflight, the Firestore rules and the seed passing.
**Does not decide:**
- staff editing of book types, or any app write to Firestore;
- alt text for covers (they are decorative), captions, galleries or any other image;
- presigned or direct browser uploads to the bucket (they would need a CSP `connect-src` change);
- R2 object versioning, a lifecycle copy or any other backup of uploaded images
  (`docs/method/FULLSTACK_MODULE.md` §9); a custom domain for the bucket;
- a production file-size limit above the hosting platform's own request-body limit
  (`docs/requests/issue-26.md`, "Known limits");
- removing a cover link whose type later disappears from the seed (the page ignores it);
- a nonce-based CSP (CF-001).

---

## D-rows

| D | Decision | Date |
|---|---|---|
| D-01 | Content store is JSON in `content/` (ADR-001) | 2026-10-10 |
| D-02 | Default locale `ar`; `/` redirects to `/ar` (fixed, never detected) | 2026-10-10 |
