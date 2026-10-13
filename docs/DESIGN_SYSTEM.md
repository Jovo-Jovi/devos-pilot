# PILOT — Design system v2 ("Reading-room timetable")

Precedence 8. **Approved design: v2, G-Design PASS under OD-07** (moved here from
`docs/design/DESIGN_SYSTEM.v2.md` by the intake for issue #7, OD-09). It supersedes the pilot design
approved under OD-02 §2. Build tasks compose this; they never restyle it. A gap is reported, not
improvised.
**Reference rendering:** `docs/design/mockup.html` (Arabic) and `mockup.html#en` (English). Where this
document and the mockup differ, this document wins; report the difference. §8 records the
clarifications made at intake; they rank with the rest of this document.

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

Every component lives in `src/components/<Name>.tsx`.

| Component | Notes |
|---|---|
| `SiteHeader` | surface background, bottom hairline. Brand (start) · nav (end): Home, Notices, `LocaleSwitch` as an outlined pill. Wraps on narrow screens; every link stays visible. Current page link in lapis. |
| `LocaleSwitch` | link to the same path in the other locale; label from `nav.switchTo`; carries `lang` of the target language. |
| `Hero` | `h1` library name from `LibraryProfile`; under it `StatusChip` and the "today" line. |
| `StatusChip` | client component. Computes from `OpeningSlot`s in **Africa/Cairo** time: "Open now, until HH:MM" (green dot) or "Closed now. Opens <day> at HH:MM" (amber dot). Renders nothing on the server (no hydration mismatch, no flash of wrong state); never stores or sends anything. |
| `TodayLine` | today's periods, e.g. "Today, Saturday: 09:00–14:00 and 17:00–21:00"; "Today, Friday: closed". See §8.1: the pages are static, so it is computed on the client in Africa/Cairo, like `StatusChip`. |
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

## 8. Clarifications at intake (issue #7, OD-09)

1. **Static pages, client clock.** `/[locale]` and `/[locale]/notices` stay statically prerendered
   (Cache Components, `generateStaticParams`). A "today" computed at build would be stale, so
   everything that depends on the current time — `StatusChip`, `TodayLine` and the today highlight in
   `Timetable` — is computed on the client after hydration, in `Africa/Cairo`, from the same
   `OpeningSlot`s the server rendered. On the server and before hydration they render nothing (no
   today line, no row highlighted). The client reads only the clock: no storage, no request.
2. **No tagline.** The hero carries no tagline (the mockup has none). The catalogue key
   `site.tagline` stays, unused by the pages.
3. **Pending state colour.** `PendingState` uses `--color-ink-muted` (v2 has no pending colour).
4. **Phone as stored.** The footer shows `LibraryProfile.phone` exactly as stored (E.164) inside
   `Bidi`; the mockup's spaced grouping is not a requirement.
5. **Heading levels.** On the home page notice titles are `h3` under the "Latest notices" `h2`; on
   the notices page they are `h2` under the page `h1`, styled as §2's notice title.
6. **Header tap targets.** Header links get `min-block-size: 2.75rem` (44px) and centre their text,
   which makes the header slightly taller than the mockup; §6 wins.
7. **States.**

| State | Where | Rendering |
|---|---|---|
| Present | all regions | as composed |
| Pending | hours, notices | `PendingState` with `state.pendingHours` / `state.pendingNotices`; never "lorem", never "TODO" |
| Not found | unknown route | Next.js 404 in the default locale |

## 9. Staff pages: the `operator` zone (issue #14, OD-10 §8)

Approved with OD-10, which the human signs by merging the intake PR. Visitors never see these pages,
and there is no mockup for them. They compose §1–§6 and add **no token, colour, face or component
style of their own**. The public pages (§4) do not change.

1. **Frame.** `SiteHeader` (with the staff path, so that `LocaleSwitch` keeps it), then
   `<main className="wrap">`, then `SiteFooter`, exactly as on the public pages. The page title is an
   `h1` with the `.page-title` style (§4, notices page). Sections use the `h2` style of §2. The staff
   home lists links to the editors that exist so far, and a sign-out button.
2. **Forms.**
   - One column, with `max-inline-size: 40rem` for the fields.
   - Each field has a visible `<label>` above its control, and a hint or error below it, linked with
     `aria-describedby`.
   - The gap between fields is `--space-5`, and between label and control `--space-2`.
   - Bilingual pairs sit one after the other, Arabic first, with the directions of `I18N_MODEL.md` §7.
3. **Controls.** Native `input`, `textarea`, `select` and `button`:
   - Fields: `--color-surface` background, a 1px `--color-line` border, `--radius-stamp`, padding
     `--space-3`, Readex Pro `--text-2`. The focus ring follows §6.
   - Dates use `type="date"`, times `type="time"`, the TOTP code `inputmode="numeric"`
     `autocomplete="one-time-code"`, and the password `autocomplete="current-password"` (or
     `new-password` when setting one).
   - Buttons have `min-block-size: 2.75rem`. The primary button has a `--color-lapis` background with
     `--color-surface` text. The secondary button is outlined like `LocaleSwitch`: lapis border and
     text.
4. **States.**
   - An error message uses `--color-stamp`, and a confirmation `--color-open`. Both are announced
     with `role="status"`.
   - In lists, a notice's status reads "Published" in `--color-open` or "Draft" in
     `--color-ink-muted`, never by colour alone.
5. **Lists.**
   - The notices list reuses the `NoticeEntry` rhythm: 1px separators, title in the §2 notice-title
     style. It adds the status and an "Edit" link.
   - The hours editor shows Saturday → Friday rows like `Timetable` (§3): the day name, then each
     period's times in `Bidi`, each with change and remove controls, and an "Add period" control per
     day.
6. **TOTP enrolment.** The QR image is shown at `inline-size: 12rem` on `--color-surface`. The secret
   is shown in `Bidi` for manual entry, followed by the code field.
7. **Quality floor (§6) applies in full.** That means focus rings, AA contrast, logical properties
   only, no horizontal scroll at 390px and 44px tap targets.
8. **The visual check for staff tasks** reads the staff screenshots that the task's e2e saves, in both
   locales and at 1280px and 390px, against this section and §1–§6.

## 10. Book types and covers (issue #26, OD-11)

Approved with OD-11, which the human signs by merging the intake PR. There is no mockup. The page
composes §1–§6 and adds **no token, colour or face**; the existing pages change only by the home link
of point 1.

1. **Home link.** After the "Latest notices" section's "All notices" link, a paragraph with one link,
   `link.bookTypes`, styled like `.all-notices`. The header navigation does not change.
2. **Page `/[locale]/book-types`.** Header → `h1` `bookTypes.title` (`.page-title`, as the notices
   page) → an `<ol>` of `BookTypeEntry`, in `sortOrder` → footer. `PendingState` with
   `state.pendingBookTypes` when there is no valid type.
3. **`BookTypeEntry`** (`src/components/BookTypeEntry.tsx`): a list item, not a card, in the
   `NoticeEntry` rhythm (1px `--color-line` separators, padding-block `--space-5`). A two-column grid:
   `BookCover` at the inline start, then the name as `h2` in the §2 notice-title style and the
   description under it in body text, `--color-ink-muted`. Column gap `--space-4`; the text column
   is centred on the cover's block axis. Phone: the same two columns.
4. **`BookCover`** (`src/components/BookCover.tsx`): a box `inline-size: 4.5rem`,
   `aspect-ratio: 3 / 4`, `--radius-stamp`, 1px `--color-line` border, `overflow: hidden`.
   - **With a cover:** `<img alt="">` filling the box with `object-fit: cover`, `loading="lazy"`,
     `decoding="async"`. It is decorative: the name beside it is the accessible text.
   - **The placeholder** (no cover): the same box, `--color-lapis-wash` background, `aria-hidden`, with
     nothing inside. Never a stock picture, an icon font or text.
5. **Staff page `/[locale]/staff/book-types`** (§9 applies): `h1` `staff.bookTypesTitle`; one entry
   per type in the `BookTypeEntry` rhythm, with `BookCover`, the name in the page's locale, then a
   form with a labelled file field (`staff.coverFile`, hint `staff.coverHint`, `accept` the three
   types) and a primary button (`staff.coverUpload`, or `staff.coverReplace` when a cover exists), and,
   when a cover exists, a secondary button `staff.coverRemove`. Errors and confirmations follow §9.4.
   The staff home lists `staff.bookTypesLink` after the hours editor.
6. **Catalogue keys added** (both locales, identical key sets). In the texts, `{formats}` and `{limit}`
   are filled with `JPEG, PNG, WebP` and `5 MB` inside `Bidi`:

| Key | Arabic | English |
|---|---|---|
| `link.bookTypes` | أنواع الكتب في المكتبة | Book types at the library |
| `bookTypes.title` | أنواع الكتب | Book types |
| `state.pendingBookTypes` | ستُنشر أنواع الكتب قريبًا. | Book types will be published soon. |
| `staff.bookTypesLink` | أغلفة أنواع الكتب | Book type covers |
| `staff.bookTypesTitle` | أغلفة أنواع الكتب | Book type covers |
| `staff.coverFile` | صورة الغلاف | Cover image |
| `staff.coverHint` | {formats}، حتى {limit}. | {formats}, up to {limit}. |
| `staff.coverUpload` | رفع الغلاف | Upload cover |
| `staff.coverReplace` | استبدال الغلاف | Replace cover |
| `staff.coverRemove` | إزالة الغلاف | Remove cover |
| `staff.coverTooLarge` | الملف أكبر من {limit}. اختر صورة أصغر. | The file is larger than {limit}. Choose a smaller image. |
| `staff.coverWrongType` | هذا الملف ليس صورة {formats}. | This file is not a {formats} image. |
| `staff.coverSaveError` | تعذّر حفظ الغلاف. حاول مرة أخرى. | The cover could not be saved. Try again. |
| `staff.coverSaved` | حُفظ الغلاف. | Cover saved. |
| `staff.coverRemoved` | أُزيل الغلاف. | Cover removed. |

   T20 adds the first three keys; T24 adds the `staff.*` keys.
7. **Visual check.** From T20 the cycle's screenshots include `/ar/book-types` and `/en/book-types` at
   1280px and 390px, and from T24 the staff book-types page in both locales.
