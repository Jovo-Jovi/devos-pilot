# PILOT — Session context

**Phase:** P04 Design v2 (J5) · **Last verdict:** T10 FAIL a2 · **Open carry-forwards:** CF-001, CF-002, CF-004, CF-006

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
| T10 | Design v2 date-stamped notices and final visual check | a1 FAIL (fence defect) — docs/reviews/T10-a1.md; a2 FAIL (fence defect) — docs/reviews/T10-a2.md; a3 built — awaiting verdict |

## Next action

T10 attempt 3, the last, is built on `task/T10` and awaits the reviewer's verdict. On PASS the human's merge signs gate `G-Design-v2` and closes phase P04. On FAIL the human decides. There is no further task in the outline.
