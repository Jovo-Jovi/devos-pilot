# PILOT — Boundary model (non-waivable, OD-01 §3)

Precedence 4.

## 1. The rule

No table, column, storage, form, input, route handler, cookie, local storage, log line, analytics
or tracking script accepts or keeps a visitor's personal data. The product reads its own content
and renders it. Nothing flows back.

## 2. What is forbidden in `src/**`

- `<form`, `<input`, `<textarea`, `<select`
- `document.cookie`, `localStorage`, `sessionStorage`, `indexedDB`, `navigator.sendBeacon`
- `route.ts` / `route.js` handlers (there is no API surface)
- any script or `fetch` to a third-party host; any analytics package (PostHog, GA, Sentry browser SDK)

`guard:boundary` checks the source and, after a build, the built HTML.

## 3. Evidence at every gate

`pnpm guards` output with `boundary: PASS`, plus the reviewer's own scan of the built HTML for the
patterns above, stated with the command.
