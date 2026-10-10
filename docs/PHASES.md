# PILOT — Phases and tasks

The runner reads the table below, and `guard:phases` checks it.

- **Done:** `[x]` only with a PASS verdict file. The runner ticks it (OD-03 §1), never the builder.
- **Gate:** a value other than `—` means this task closes a station gate. Its PASS stops the
  cycle for the human (OD-03 §4). Every risk-3 task stops the cycle too.
- **Verdict:** `PASS aN — <file>` or `FAIL aN — <file>`, written by the runner.

| Task | Phase | Station | Name | Risk | Gate | Done | Verdict |
|---|---|---|---|---|---|---|---|
| T01 | P01 | J4 | Foundation: app shell, locales, tokens, catalogues, checks | 2 | — | [x] | PASS a1 — docs/reviews/T01-a1.md |
| T02 | P01 | J4 | Security-header baseline | 3 | G-Foundation | [x] | PASS a1 — docs/reviews/T02-a1.md |
| T03 | P02 | J5 | Home composition: header, opening hours, footer | 2 | — | [x] | PASS a1 — docs/reviews/T03-a1.md |
| T04 | P02 | J5 | Library notices: home teaser and notices page | 2 | — | [x] | PASS a1 — docs/reviews/T04-a1.md |
| T05 | P02 | J5 | Rendered evidence in both locales (Playwright) | 2 | G-Public | [x] | PASS a1 — docs/reviews/T05-a1.md |
| T06 | P03 | J9 | Inventory script and delivered-state documents | 1 | G-Harden | [x] | PASS a1 — docs/reviews/T06-a1.md |
| T07 | P04 | J5 | Design v2 shell: tokens, faces, header, footer, page frame | 2 | — | [x] | PASS a1 — docs/reviews/T07-a1.md |
| T08 | P04 | J5 | Design v2 timetable (replaces OpeningHours) | 2 | — | [ ] | — |
| T09 | P04 | J5 | Design v2 hero: open-now status chip, today line, today highlight | 2 | — | [ ] | — |
| T10 | P04 | J5 | Design v2 date-stamped notices and final visual check | 2 | G-Design-v2 | [ ] | — |

## Phase outlines (the reviewer writes each fence from these)

- **T01**: issued, `docs/fences/T01.md`.
- **T02**: `next.config.ts` `headers()` with the exact table in `SECURITY_MODEL.md` §2. Add
  `scripts/devos/probe.mjs`-verifiable evidence and a Vitest test that imports the config and
  asserts each header. Log CF for nonce-based CSP. Heavyweight review.
- **T03**: content loader with schema validation (`src/content/`), `SiteHeader`, `LocaleSwitch`,
  `OpeningHours`, `PendingState`, `SiteFooter`, `Bidi`; the home composition from
  `DESIGN_SYSTEM.md` §3 without the notices region. Unit tests for the loader and day ordering.
- **T04**: `NoticeCard`; published-only, newest-first selector with tests; the home's latest-3
  region; `/[locale]/notices`.
- **T05**: Playwright: `/ar` has `dir="rtl"`, `/en` has `dir="ltr"`; the switch keeps the path;
  phone and times are inside `<bdi>`; the pending state renders when a fixture empties the content;
  screenshots of both locales as CI artefacts; `e2e` script wired into the checks. Gate G-Public.
- **T06**: `scripts/inventory.mjs` prints routes, components, catalogue keys, content counts,
  guard list; `SCOPE.md` §4 filled from it; every model document brought to the delivered state;
  carry-forward triage table for the human. Gate G-Harden.
- **T07** (OD-09, issue #7): issued, `docs/fences/T07.md`. v2 tokens (`DESIGN_SYSTEM.md` §1) with
  the phone override; Reem Kufi + Readex Pro via `next/font/google` in both root layouts; `Bidi` as
  `<bdi dir="ltr">`; `SiteHeader` (brand link, current-page `aria-current`, outlined `LocaleSwitch`
  pill, 44px tap targets), `SiteFooter` (definition lists), `PendingState` muted; page frame (`.wrap`,
  hero `h1`, section `h2`, notices `h1`); tagline removed; interim restyle of `OpeningHours` and
  `NoticeCard` on v2 tokens only. e2e: faces, `aria-current`, no horizontal scroll at 390px.
- **T08**: `Timetable` replaces `OpeningHours` (§3): Saturday→Friday rows from catalogue day names,
  axis ticks 08–22, lapis bars placed by `inset-inline-start`/`inline-size` percentages of 08:00–22:00
  from a pure, unit-tested function, times in `Bidi` joined by `list.and`, "Closed" from
  `state.closed`, `OpeningSlot` notes under the day name, `timetable.label` as the panel's accessible
  name; phone single column. Catalogue keys `state.closed`, `list.and`, `timetable.label`. e2e: the
  times-in-`bdi` test moves to the new markup; a bar is mirrored between `/ar` and `/en`. No today
  highlight yet. `OpeningHours.tsx` deleted.
- **T09**: client time logic in `Africa/Cairo` (pure functions with unit tests at fixed instants:
  open, between periods, after closing, on the closed Friday, across the week end) and a
  `useSyncExternalStore` clock with a `null` server snapshot; `StatusChip`, `TodayLine` and the today
  row highlight in `Timetable` (`DESIGN_SYSTEM.md` §8.1). Catalogue keys `status.openUntil`,
  `status.closedOpens`, `today.label`, `today.closed`. e2e with Playwright's clock fixed to a known
  Cairo instant: chip text, today line, one highlighted row; server HTML contains none of them.
  Boundary: the client code reads only the clock.
- **T10**: `NoticeEntry` and `DateStamp` replace `NoticeCard` on both pages (`<ol>` list, 1px
  separators, month names from `Intl.DateTimeFormat`); `NoticeCard.tsx` deleted; e2e notice tests move
  to the new markup and assert the stamp day and month per locale. Full visual check of all four pages
  at 1280px and 390px against `DESIGN_SYSTEM.md` and the mockup; record CF-005 as `CLOSED at T10` in
  `docs/method/CARRY_FORWARDS.md`. Gate G-Design-v2 (OD-07 §2): the human's merge signs it.
