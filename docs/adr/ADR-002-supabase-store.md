# ADR-002 — Notices and opening hours live in Supabase Postgres

**Status:** Proposed with OD-10, 2026-10-12. It is accepted when the human merges the intake PR for
issue #14.
**Supersedes:** ADR-001, for `LibraryNotice` and `OpeningSlot`.
**Follows:** Dev OS v2 §9, the Profile A reference architecture.

## Context

Issue #14 asks for invited library staff to publish notices and edit the weekly opening hours, and for
the public pages to update without a redeploy. JSON files in git have no run-time write path. Only a
commit and a deploy can change them, which is the reason ADR-001 gave for choosing them. The method's
backend module (`docs/method/FULLSTACK_MODULE.md`, PR-17 to PR-19) now supplies the controls that
ADR-001 avoided:
- migrations as code;
- RLS proven by pgTAP;
- the `db`, `db-test` and `types` checks;
- the deploy order backup → migrations → app.

## Decision

- **The tables.** `LibraryNotice` and `OpeningSlot` live in `public.library_notices` and
  `public.opening_slots`, as `docs/DATA_MODEL.md` specifies.
- **Schema changes** happen only through forward-only migrations in `supabase/migrations/`.
- **Security.** Both tables have RLS. Anonymous visitors read published notices and every opening
  slot. Writes need the staff claim and AAL2.
- **Accounts.** Staff accounts live in Supabase Auth and exist only by invitation.
- **`LibraryProfile`** stays in `content/library-profile.json` (ADR-001 still holds for it).
- **The public pages** read on the server with the publishable key and no session, through tag-cached
  reads. They stay prerendered and are refreshed by tag when staff write.

## Consequences

- Migrations, policies, auth and headers become risk-3 work, and every schema change stops at the
  human gate (PR-17).
- Every run starts a throwaway local Supabase. The `db`, `db-test` and `types` checks join the required
  checks.
- The build needs the database, because the public pages are prerendered from it:
  - in CI, the local stack provides it;
  - in production, the two public Supabase values must be set in Vercel;
  - previews are skipped unless a preview database exists (PR-18).
- Production deploys back up, then migrate, then build (PR-18). Fixes go forward as new migrations.
- The free hosted plan pauses after a week without activity (`FULLSTACK_MODULE.md` §8).
- The two JSON files for notices and opening hours stop being read at T13. They stay as the record of
  the content that moved.
