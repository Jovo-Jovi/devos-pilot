# PILOT — i18n model

Precedence 6.

## 1. Locales

| Locale | Direction | Default | `<html>` |
|---|---|---|---|
| `ar` | `rtl` | yes | `lang="ar" dir="rtl"` |
| `en` | `ltr` | no | `lang="en" dir="ltr"` |

## 2. Where the locale comes from

The first URL segment only. Nothing is inferred from `Accept-Language`, cookies or geography, and
nothing is stored. `/` redirects to `/ar` (D-02). An unknown first segment is a 404.

## 3. Strings

- One catalogue per locale: `src/i18n/messages/ar.json`, `src/i18n/messages/en.json`.
- Identical key sets; `guard:i18n` fails on any difference.
- No interface text as a literal in components. Content text comes from `content/` bilingual pairs.

## 4. Direction and isolation

- Logical CSS properties only (`margin-inline-start`, `padding-block`, `inset-inline-end`,
  `text-align: start`). `guard:design` fails on physical ones.
- Latin runs inside Arabic text (phone numbers, times, codes, emails) are wrapped in the isolation
  primitive `<Bidi>` (`src/components/Bidi.tsx`, renders `<bdi dir="ltr">` with `white-space: nowrap`
  from design v2, OD-09), so they never reorder.
- Times render in 24h `HH:MM` inside `<Bidi>` in both locales. Day names come from the catalogues.
  Month names on the notice date stamp come from `Intl.DateTimeFormat` (`month: "long"` for `ar`,
  `month: "short"` for `en`), never from a hardcoded list. Time-of-day logic uses the fixed zone
  `Africa/Cairo`, never the visitor's zone or locale (OD-09).

## 5. Language switch

A link to the same path under the other locale. It is a plain link: no state, no storage.

## 6. Evidence

`e2e/locales.spec.ts` (T05) asserts `lang`/`dir` on `/ar`, `/en`, `/ar/notices` and `/en/notices`, a 404 on `/fr` and `/fr/notices`, that the language switch keeps the path, and that the footer phone and every opening-hours time render inside `<bdi>` in both locales.
