# PILOT — Session context

**Phase:** P05 Staff editor on Supabase (J4) · **Last verdict:** T12 PASS a1 · **Open carry-forwards:** CF-001, CF-002, CF-004, CF-006

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
| T11 | Backend module: Supabase project, first migration with RLS, pgTAP proof, client helpers | PASS a1 — docs/reviews/T11-a1.md (schema change signed by the human's merge) |
| T12 | Move notices and opening hours from the JSON files into the database | PASS a1 — docs/reviews/T12-a1.md (migration signed by the human's merge) |
| T13 | Public pages read published rows from the database, cached by tag | built — awaiting verdict |

## Next action

T13 is built on `task/T13` and awaits the reviewer's verification (risk 2). It adds no migration, so its PASS merges without the human gate. From then on, production builds read the hosted database, so the OD-10 §10 setup must be done first (docs/reviews/T12-a1.md, carry-forward (a)). Next is T14: staff sign-in with password and TOTP, the session proxy and the staff headers.
