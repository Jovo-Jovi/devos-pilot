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

---

## 2026-10-10 — T02 security-header baseline (builder, Grok 4.7)

`next.config.ts` `headers()` sends the six headers from `docs/SECURITY_MODEL.md` §2 on `/:path*`.
`Strict-Transport-Security` is `max-age=86400` with no `includeSubDomains`. `src/security/headers.test.ts`
imports that array. Nonce-based CSP is a carry-forward candidate, not implemented. `pnpm check` exits 0.
Awaiting verdict.

---

## 2026-10-10 — T03 home composition (builder, Grok 4.7)

The home page at `/[locale]` renders the library name, opening hours and footer from the signed
content files. Parsers reject invalid content at build time, and opening slots are ordered
Sunday-first. Latest notices stay out until T04. Carry-forwards CF-001, CF-002 and CF-003 are
landed from the T02 verdict. `pnpm check` exits 0. Awaiting verdict.

---

## 2026-10-10 — T04 library notices (builder, Grok 4.7)

The home page shows the three newest published notices, and `/[locale]/notices` lists every
published notice, newest first. A draft never renders. `pnpm check` exits 0. Awaiting verdict.

---

## 2026-10-10 — T05 rendered evidence (builder, Grok 4.7)

Playwright runs the production build in both locales and saves four screenshots under
`.devos/screenshots/`. Pending states are proved by a unit fixture, because the content is bundled
at build time and a built page cannot be emptied from a browser test. `pnpm check` exits 0.
Awaiting verdict.

---

## 2026-10-10 — T06 inventory script and delivered-state documents (builder, Grok 4.7)

`scripts/inventory.mjs` prints routes, redirects, components, catalogue keys, content counts,
guards and tests from the tree. `docs/SCOPE.md` §4 is filled from that output. The design,
security, content and i18n documents are at the delivered state. CF-003 is closed. CF-004,
CF-005 and CF-006 are landed from the T05 verdict, and the triage table is for the human at
G-Harden. `pnpm check` exits 0. Awaiting verdict.

---

## 2026-10-10 — T07 design v2 shell (builder, Grok 4.7)

The home and notices pages use the v2 tokens, Reem Kufi and Readex Pro, the header, the footer
and the page frame. Opening hours stay a table and notices stay cards, restyled on the v2 tokens
only. `pnpm check` exits 0. Awaiting verdict.
