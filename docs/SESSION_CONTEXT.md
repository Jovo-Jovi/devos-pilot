# PILOT — Session context

**Phase:** P06 Book types and covers (J5) · **Last verdict:** T21 PASS a1 · **Open carry-forwards:** CF-001, CF-002, CF-004, CF-006

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
| T13 | Public pages read published rows from the database, cached by tag | PASS a1 — docs/reviews/T13-a1.md |
| T14 | Staff sign-in: password, TOTP enrolment and challenge, session proxy, staff headers | PASS a2 — docs/reviews/T14-a2.md |
| T15 | Staff invitation: confirm link, set password, then TOTP | PASS a1 — docs/reviews/T15-a1.md |
| T16 | Notices editor: create, edit, publish, unpublish; public pages refresh by tag | PASS a1 — docs/reviews/T16-a1.md |
| T17 | Opening-hours editor: add, change and remove periods | PASS a1 — docs/reviews/T17-a1.md |
| T18 | Whole-zone end-to-end proof against the CI database | PASS a1 — docs/reviews/T18-a1.md (gate G-Staff-editor signed by the human's merge) |
| T19 | Firestore module: rules denying every client, rules tests, server-only reader, book-types seed | PASS a1 — docs/reviews/T19-a1.md (rules file reviewed at the human's merge) |
| T20 | Public book-types page from Firestore, with the cover placeholder, linked from home | PASS a3 — docs/reviews/T20-a3.md |
| T21 | Migration: book_type_covers link table with RLS and pgTAP proof | PASS a1 — docs/reviews/T21-a1.md (schema change signed by the human's merge) |
| T22 | Storage module (R2): server-only bucket client, image validation and re-encoding, storage tests | built — awaiting verdict |

## Next action

T22 is built on `task/T22` and awaits the deep review. The storage module is server-only code in `src/lib/r2/`: the bucket client, cover-image validation and re-encoding, and the storage tests. Nothing visible changes, and no page imports it yet. This task is risk 3 (storage keys): a PASS stops at the human gate. Next is T23, covers on the public page.
