# Issue #7 — Build design v2

**Decision:** accepted · **OD:** OD-09 (DRAFT, signed by merging the intake PR) · **Tasks:** T07–T10 ·
**Gate:** G-Design-v2 on T10 · **First fence:** `docs/fences/T07.md` · Intake date: 2026-10-10.

## What was asked (the request, verbatim)

> **What should change:** Build design v2 from docs/design/DESIGN_SYSTEM.v2.md and
> docs/design/mockup.html on the home and notices pages in both languages: timetable, open-now
> status, date-stamped notices, new fonts and colours.
>
> **Why:** _No response_
>
> **How you will judge it done:** The preview matches the mockup on phone and desktop in Arabic and
> English, and all checks pass. (Three screenshots attached: 1280×1860, 390×2177, 1280×1828.)
>
> **Priority:** Next up

## How it was read

The request is the change request OD-07 §2 anticipates: design v2 is already approved (OD-07 §1), so
this intake plans the build and moves v2 into `docs/DESIGN_SYSTEM.md`. It asks for no new content,
page or data collection, so the Boundary gate (OD-01 §3) is untouched and nothing had to be refused.
The issue's "judged done" test maps to OD-07 §3's visual check (screenshots at 1280px and 390px in
both locales) plus the required checks.

## What was decided

- **OD-09** drafted in `docs/DECISIONS.md`; `docs/SCOPE.md` §3 amendment A-1.
- **`docs/DESIGN_SYSTEM.md`** now holds the v2 text (moved from `docs/design/DESIGN_SYSTEM.v2.md`),
  with §8 "Clarifications at intake":
  1. *Static pages, client clock.* The design says "today" is computed "at request/build". The pages
     are statically prerendered (Cache Components, `generateStaticParams`), so a build-time "today"
     would be stale. `StatusChip`, `TodayLine` and the timetable's today highlight are all computed on
     the client in `Africa/Cairo`; the server renders none of them. The client reads only the clock.
  2. No tagline in the hero (the mockup has none); `site.tagline` stays in the catalogues.
  3. `PendingState` uses `--color-ink-muted` (v2 has no pending colour).
  4. The phone is shown as stored (E.164) inside `Bidi`.
  5. Notice heading levels: `h3` on the home page, `h2` on the notices page.
  6. Header tap targets are 44px (§6 wins over the mockup's slimmer header).
- **`docs/I18N_MODEL.md`** §4: `Bidi` is `<bdi dir="ltr">`; month names from `Intl.DateTimeFormat`;
  time logic in the fixed zone `Africa/Cairo`.
- **Tasks** (each leaves both pages working):
  - T07 shell: tokens, faces, header, footer, page frame (interim styling for the old table and cards).
  - T08 `Timetable` replaces `OpeningHours`.
  - T09 `StatusChip`, `TodayLine`, today highlight (client clock, unit-tested pure time functions).
  - T10 `NoticeEntry` + `DateStamp` replace `NoticeCard`; final visual check; gate G-Design-v2.
- All four are risk 2: presentational work, no header, auth or data-protection change. The T09 client
  code reads the clock only; the reviewer still runs the Boundary check on every task.

## What was left out, and why

- **Phone grouping** ("+20 2 0000 0000" in the mockup): formatting is not in the design document,
  which wins over the mockup; the stored value is shown.
- **Removing `site.tagline`** from the catalogues: not requested; harmless to keep.
- **A `nav` accessible name** (the mockup's `aria-label="Main"`): it would need a catalogue key the
  design does not list. One `nav` landmark needs no name.
- **Carry-forwards.** CF-005 (links in the browser's default colour) is resolved in substance by T07's
  lapis link colour; T10 records it `CLOSED at T10`. No other CF is touched. Note: the G-Harden triage
  in `docs/method/CARRY_FORWARDS.md` still shows every row `OPEN`, and `docs/SESSION_CONTEXT.md` still
  shows T06 awaiting a verdict; T07 S12 brings the session context up to date.
- **`docs/SCOPE.md` §4** (the T06 inventory block) is not refreshed here: it records the delivered state
  at T06 and changes only when a task delivers.
- **Not rehearsed with a build.** The intake runner has no `node_modules`; the T07 fence was rehearsed
  against the tree and the guards only, which its Rehearsed line states. P5 makes the builder confirm the
  two font families exist in the installed `next/font` before relying on them.
