# PILOT — Session context

**Phase:** P05 Staff editor on Supabase (J4) · **Last verdict:** T10 PASS a3 · **Open carry-forwards:** CF-001, CF-002, CF-004, CF-006

## Done steps

| Step | What | State |
|---|---|---|
| B0 | Bootstrap: method documents, models, approved design, fence T01, automation | committed by the human (signs OD-01 to OD-06) |
| T01 | Foundation | PASS a1 — docs/reviews/T01-a1.md |
| T02 | Security-header baseline | PASS a1 — docs/reviews/T02-a1.md |
| T03 | Home composition: header, opening hours, footer | PASS a1 — docs/reviews/T03-a1.md |
| T04 | Library notices: home teaser and notices page | PASS a1 — docs/reviews/T04-a1.md |
| T05 | Rendered evidence in both locales (Playwright) | PASS a1 — docs/reviews/T05-a1.md |
| T06 | Inventory script and delivered-state documents | PASS a1 — docs/reviews/T06-a1.md |
| T07 | Design v2 shell: tokens, faces, header, footer, page frame | PASS a1 — docs/reviews/T07-a1.md |
| T08 | Design v2 timetable (replaces OpeningHours) | PASS a1 — docs/reviews/T08-a1.md |
| T09 | Design v2 hero: open-now status chip, today line, today highlight | PASS a1 — docs/reviews/T09-a1.md |
| T10 | Design v2 date-stamped notices and final visual check | PASS a3 — docs/reviews/T10-a3.md (gate G-Design-v2 signed by the human's merge) |
| T11 | Backend module: Supabase project, first migration with RLS, pgTAP proof, client helpers | built — awaiting verdict |

## Next action

T11 is built on `task/T11` and awaits the heavyweight review (risk 3). Its PASS stops at the human gate because it changes the schema (PR-17): the human reviews the migration and merges, and with `DEVOS_SUPABASE=true` the production deploy backs up and applies it before the app (PR-18). Next is T12: the notices and opening hours move into the database by a migration.
