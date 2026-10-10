# PILOT — Phases and tasks

The runner reads the table below, and `guard:phases` checks it.

- **Done:** `[x]` only with a PASS verdict file. The runner ticks it (OD-03 §1), never the builder.
- **Gate:** a value other than `—` means this task closes a station gate. Its PASS stops the
  cycle for the human (OD-03 §4). Every risk-3 task stops the cycle too.
- **Verdict:** `PASS aN — <file>` or `FAIL aN — <file>`, written by the runner.

| Task | Phase | Station | Name | Risk | Gate | Done | Verdict |
|---|---|---|---|---|---|---|---|
| T01 | P01 | J4 | Foundation: app shell, locales, tokens, catalogues, checks | 2 | — | [ ] | — |
| T02 | P01 | J4 | Security-header baseline | 3 | G-Foundation | [ ] | — |
| T03 | P02 | J5 | Home composition: header, opening hours, footer | 2 | — | [ ] | — |
| T04 | P02 | J5 | Library notices: home teaser and notices page | 2 | — | [ ] | — |
| T05 | P02 | J5 | Rendered evidence in both locales (Playwright) | 2 | G-Public | [ ] | — |
| T06 | P03 | J9 | Inventory script and delivered-state documents | 1 | G-Harden | [ ] | — |

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
