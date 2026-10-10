# PILOT — Design system v2 ("Reading-room timetable")

**Status:** APPROVED under OD-07 (signed by the push that lands it). Supersedes `docs/DESIGN_SYSTEM.md`
§1–§5. The intake for the redesign request moves this text into `docs/DESIGN_SYSTEM.md`.
**Reference rendering:** `docs/design/mockup.html` (Arabic) and `mockup.html#en` (English). Where this
document and the mockup differ, this document wins; report the difference.

## 0. Idea

A neighbourhood library in Cairo, read mostly on phones, Arabic first. The page answers two questions:
*is it open, and when?* and *what's new at the library?* The memorable element is the **week drawn as a
reading-room timetable**: one bar per opening period on a 08:00–22:00 axis, mirrored right-to-left in
Arabic, today highlighted. Everything around it stays quiet. Notice dates use the vernacular of a
library date stamp.

Avoided on purpose: cream paper, near-black, identical shadowed cards, all-caps labels, arrows on links,
entrance animations.

## 1. Tokens (`src/styles/tokens.css` — the only file with raw values)

```css
:root {
  --color-paper: #edf1f3;
  --color-surface: #ffffff;
  --color-ink: #172a3a;
  --color-ink-muted: #586776;
  --color-lapis: #2747a8;
  --color-lapis-wash: #dde5f6;
  --color-stamp: #b5333f;
  --color-open: #1f7a52;
  --color-closed: #8a4b12;
  --color-line: #d3dce2;

  --font-display: var(--font-kufi), var(--font-readex), system-ui, sans-serif;
  --font-text: var(--font-readex), system-ui, sans-serif;

  --text-1: 0.875rem;  --text-2: 1.0625rem; --text-3: 1.375rem;
  --text-4: 1.875rem;  --text-5: 2.75rem;   --text-6: 3.75rem;
  --leading-text: 1.8; --leading-text-latin: 1.6; --leading-tight: 1.2;

  --space-1: 0.25rem; --space-2: 0.5rem; --space-3: 0.75rem; --space-4: 1rem;
  --space-5: 1.5rem;  --space-6: 2rem;   --space-7: 3rem;    --space-8: 4.5rem;

  --radius-bar: 999px; --radius-stamp: 0.625rem; --radius-chip: 999px;
  --content-max: 56rem;
  --bar-height: 0.875rem;
}
```

Phone (`max-width: 40rem`): `--text-6: 2.625rem; --text-4: 1.5rem;`.

## 2. Type

| Role | Face | Weight | Size / leading |
|---|---|---|---|
| Hero (library name) | Reem Kufi | 700 | `--text-6` / `--leading-tight`, max 12ch (ar), 14ch (en) |
| Section heading `h2` | Reem Kufi | 600 | `--text-4` / tight |
| Brand in header | Reem Kufi | 600 | `--text-2` |
| Notice title `h3` | Readex Pro | 600 | `--text-3` / 1.35 |
| Body, notice text | Readex Pro | 400 | `--text-2` / 1.8 (ar), 1.6 (en); max 60ch |
| Meta (times, ticks, labels) | Readex Pro | 400–500 | `--text-1`, tabular numerals |

Both faces load with `next/font/google` (`Reem_Kufi` weights 500/600/700, `Readex_Pro` 400/500/600,
subsets `arabic` + `latin`), self-hosted at build, exposed as `--font-kufi` and `--font-readex`.
English display text gets `word-spacing: 0.14em` (Reem Kufi's Latin word space is narrow). No all-caps.
Sentence case everywhere.

## 3. Components

| Component | Notes |
|---|---|
| `SiteHeader` | surface background, bottom hairline. Brand (start) · nav (end): Home, Notices, `LocaleSwitch` as an outlined pill. Wraps on narrow screens; every link stays visible. Current page link in lapis. |
| `LocaleSwitch` | link to the same path in the other locale; label from `nav.switchTo`; carries `lang` of the target language. |
| `Hero` | `h1` library name from `LibraryProfile`; under it `StatusChip` and the "today" line. |
| `StatusChip` | client component. Computes from `OpeningSlot`s in **Africa/Cairo** time: "Open now, until HH:MM" (green dot) or "Closed now. Opens <day> at HH:MM" (amber dot). Renders nothing on the server (no hydration mismatch, no flash of wrong state); never stores or sends anything. |
| `TodayLine` | server text: today's periods, e.g. "Today, Saturday: 09:00–14:00 and 17:00–21:00"; "Today, Friday: closed". "Today" is computed in Africa/Cairo at request/build; if the page is static, `StatusChip` also highlights today's row on the client. |
| `Timetable` (replaces `OpeningHours`) | surface panel, `--radius-stamp`, 1px line border. Axis row with ticks 08,10,…,22. One row per day **Saturday → Friday**. Grid: day column 7rem + track; phone: single column (day, track, times). Track: faint hour lines every 2 h. Bars: lapis, fully rounded, `inset-inline-start` and `inline-size` as percentages of 08:00–22:00 — **logical properties only**, so RTL mirrors with no extra code. Times text under the track (muted, `--text-1`). Days with no slot show "Closed" in `--color-closed`. Today's row: lapis wash background, day name in lapis 600. The bars are `aria-hidden`; the times text is the accessible content. |
| `NoticeEntry` (replaces `NoticeCard`) | list item, not a card: `DateStamp` + title + body. Entries separated by a 1px line. |
| `DateStamp` | outlined box in `--color-stamp`, 2px, `--radius-stamp`: day number (Reem Kufi 600, `--text-4`; phone `--text-3`) over month name (`--text-1`). |
| `PendingState` | unchanged role; muted text in the region's place. |
| `SiteFooter` | surface background, top hairline; definition list: Address, Phone. |
| `Bidi` | renders `<bdi dir="ltr">` with `white-space: nowrap` for times, dates and phone numbers — a bare `<bdi>` falls back to the paragraph's RTL when the content has no letters, which reverses "+20 2 0000 0000". |

## 4. Compositions

**Home `/[locale]`:** header → hero (name, status chip, today line) → "Opening hours" `Timetable` →
"Latest notices" (3 newest `NoticeEntry`) + "All notices" link → footer. Single column,
`max-inline-size: var(--content-max)`, centred, `padding-inline: var(--space-4)`. Hero padding-block
`--space-8` / `--space-6` (phone `--space-7` / `--space-5`); sections `--space-6`.

**Notices `/[locale]/notices`:** header → `h1` "Notices" (Reem Kufi, `--text-5`) → every published
`NoticeEntry`, newest first → footer. Pending state when none.

## 5. Catalogue keys added

`state.closed` ("مغلقة" / "Closed"), `status.openUntil` ("مفتوحة الآن حتى {time}" / "Open now, until
{time}"), `status.closedOpens` ("مغلقة الآن، تفتح {day} الساعة {time}" / "Closed now. Opens {day} at
{time}"), `today.label` ("اليوم {day}:" / "Today, {day}:"), `today.closed` ("اليوم {day}: مغلقة" /
"Today, {day}: closed"), `list.and` (" و" / ", "), `timetable.label` ("جدول المواعيد الأسبوعي" /
"Weekly opening timetable"). Month names come from `Intl.DateTimeFormat(locale, { month: "short" })`
for `en` and `{ month: "long" }` for `ar`.

## 6. Quality floor

Visible focus ring (2px lapis, offset 3px) on every link; colour contrast AA for all text on paper and
surface; `prefers-reduced-motion` respected (there is no motion); phone layout at 390px with no
horizontal scroll; tap targets ≥ 44px in the header.

## 7. How the reviewer checks it

The cycle saves screenshots of `/ar`, `/en`, `/ar/notices`, `/en/notices` at 1280px and 390px in
`.devos/screens/`. The reviewer compares them with this document and the mockup: faces, scale,
colours, the timetable (bars at the right times, mirrored in `ar`, today highlighted), the date stamps,
the phone layout. A visible departure is a FAIL.
