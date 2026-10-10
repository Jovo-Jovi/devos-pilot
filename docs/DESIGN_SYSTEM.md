# PILOT — Design system

Precedence 8. **Approved design (G-Design PASS under OD-02 §2).** Build tasks compose this; they
never restyle it. A gap is reported, not improvised.

## 1. Tokens (`src/styles/tokens.css`, the only file allowed raw values)

```css
:root {
  --color-ink: #1d2433;
  --color-ink-muted: #5b6475;
  --color-paper: #fbf8f2;
  --color-surface: #ffffff;
  --color-accent: #0f6e5c;
  --color-accent-ink: #ffffff;
  --color-line: #e4ddd0;
  --color-pending: #8a6d1f;

  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 32px; --space-7: 48px;

  --radius-1: 6px; --radius-2: 12px;

  --font-body: var(--font-sans), system-ui, sans-serif;
  --text-1: 0.875rem; --text-2: 1rem; --text-3: 1.25rem; --text-4: 1.75rem; --text-5: 2.25rem;
  --leading: 1.6;

  --content-max: 960px;
}
```

`--font-sans` is set by `next/font/google` with **IBM Plex Sans Arabic** (weights 400, 600),
self-hosted at build. No font is loaded from a third-party host at run time.

## 2. Components

| Component | File | Notes |
|---|---|---|
| `SiteHeader` | `src/components/SiteHeader.tsx` | library name (from `LibraryProfile`), nav (Home, Notices), `LocaleSwitch` at the inline end |
| `LocaleSwitch` | `src/components/LocaleSwitch.tsx` | link to the same path in the other locale; label from catalogue `nav.switchTo` |
| `OpeningHours` | `src/components/OpeningHours.tsx` | a `<table>`: day name · opens–closes in `<Bidi>` · note |
| `NoticeCard` | `src/components/NoticeCard.tsx` | title, date in `<Bidi>`, body; card = surface, line border, `--radius-2` |
| `PendingState` | `src/components/PendingState.tsx` | icon-free text in `--color-pending`, used when a region's data is absent |
| `SiteFooter` | `src/components/SiteFooter.tsx` | address, phone in `<Bidi>` |
| `Bidi` | `src/components/Bidi.tsx` | renders `<bdi>`; the isolation primitive |

## 3. Composition — home (`/[locale]`)

```
┌ SiteHeader ──────────────────────────────────────────────┐
│ [library name]                 Home · Notices · [switch] │
└──────────────────────────────────────────────────────────┘
  h1  library name            (text-5, ink)
  p   tagline                 (text-3, ink-muted)
  h2  opening hours           → OpeningHours | PendingState(state.pending.hours)
  h2  latest notices          → 3 × NoticeCard | PendingState(state.pending.notices)
      link "all notices" → /[locale]/notices
┌ SiteFooter ──────────────────────────────────────────────┐
│ address · phone                                          │
└──────────────────────────────────────────────────────────┘
```

Content column: `max-inline-size: var(--content-max)`, centred with `margin-inline: auto`,
`padding-inline: var(--space-4)`. Section gap `--space-7`. Mirrors fully in RTL from the same CSS.

## 4. Composition — notices (`/[locale]/notices`)

SiteHeader · h1 (`nav.notices`) · every published `NoticeCard` in one column, gap `--space-5` ·
PendingState when none · SiteFooter.

## 5. States

| State | Where | Rendering |
|---|---|---|
| Present | all regions | as composed |
| Pending | hours, notices | `PendingState` with the catalogue string; never "lorem", never "TODO" |
| Not found | unknown route | Next.js 404 in the URL's locale where one is known |
