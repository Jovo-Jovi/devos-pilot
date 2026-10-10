# PILOT — Development journal

Append-only. Newest entry last. One entry per task attempt, written by the builder; the reviewer's
verdicts live in `docs/reviews/`.

---

## 2026-10-10 — B0 bootstrap (reviewer surface, Claude)

Dev OS v2 fit research done (`docs/method/DEVOS_FIT.md`). Profile A, Boundary gate, no domain gate.
Stations J0–J3 compressed into the bootstrap: the human plays the client (OD-02). Automation
(OD-03): GitHub Actions runner relays fences and reports between Cursor (Grok 4.7 high) and Claude
Code. Cursor marketplace reviewed for tooling (OD-06): Context7 and Playwright MCP only. Fence T01
issued.

---

## 2026-10-10 — T01 foundation (builder, Grok 4.7)

Next.js 16.4.0 app shell with Cache Components and Partial Prefetching. Locales `ar` (default, rtl)
and `en` (ltr) come from the first URL segment; `/` redirects to `/ar` with status 307. Catalogues,
design tokens, the shell page, and the two unit tests are in place. `pnpm check` exits 0. Awaiting
verdict.
