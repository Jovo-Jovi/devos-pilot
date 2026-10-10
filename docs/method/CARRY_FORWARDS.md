# PILOT — Carry-forwards

Every finding becomes a row. The reviewer describes the row in a verdict; the landing task allocates
the id from the live maximum and reports it. **Live maximum: CF-006**.

Statuses: `OPEN` · `CLOSED at <task>` · `ACCEPTED at <task>` · `MAINTENANCE` · `HANDOVER`.

| CF | Item (finding, where, evidence) | Owner | Status | Lands at |
|---|---|---|---|---|
| CF-001 | Replace `'unsafe-inline'` in CSP `script-src` with a nonce-based CSP. Where: `next.config.ts:15`, SECURITY_MODEL §2 lines 24-25. Evidence: the probe's `content-security-policy` line. | the human schedules it (no task in `docs/PHASES.md` outlines carries it), triaged at T06 | OPEN | T02 verdict |
| CF-002 | The `/` 307 redirect response carries none of the six baseline headers: `node scripts/devos/probe.mjs --port 3100 /` prints only `location: /ar`. The implementation matches SECURITY_MODEL §2's own `source: "/:path*"`, and the response has no body. The human must decide whether §2's "every route" covers redirect responses and, if it does, amend §2 with the mechanism. | human decision, re-checked at T06 | OPEN | T02 verdict |
| CF-003 | DOC CORRECTION: `docs/DESIGN_SYSTEM.md` §3 lines 55-56 name catalogue keys `state.pending.hours` / `state.pending.notices`, but the catalogues (`src/i18n/messages/*.json`, fence T01 S5) use `state.pendingHours` / `state.pendingNotices`. The code is correct. The document should be amended to match. | T06 (documents brought to the delivered state) | CLOSED at T06 | T02 verdict |
| CF-004 | MAINTENANCE candidate: every `pnpm test` warns `ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1)` under `configLoader: 'native'` (runner `test` tail). `package.json` has no `"type": "module"`. The fix is to rename the config to `vitest.config.mts` or set the package type. | the human at the T06 triage (first noted in `docs/reviews/T03-a1.md:13`; never landed as a row) | OPEN | T05 verdict |
| CF-005 | Design gap: `docs/DESIGN_SYSTEM.md` §1 defines `--color-accent` and `--color-accent-ink`, but no section assigns them to anything. Grep in `src/` finds them only in `tokens.css`. Header nav, `LocaleSwitch` and "all notices" links therefore render in the browser's default link colour and underline (visible in `.devos/screenshots/ar-home.png`, `en-notices.png`). The design was approved as written, so this is not a T03–T05 defect. J9 hardening changes no appearance, so the human decides: accept as delivered, or amend the design and schedule a task. | the human at the T06 triage | OPEN | T05 verdict |
| CF-006 | DOC CORRECTION: `docs/PRODUCT_BRIEF.md:30` ("CSS modules on one token stylesheet") and `docs/method/DEVOS_FIT.md:68-70` describe CSS modules. The delivered styling is one global stylesheet `src/styles/global.css` on `src/styles/tokens.css`, with no CSS module (Glob `src/**/*.css` → those 2 files), as fences T01 S6 and T04 S5 directed. The brief is signed (precedence 1), and `DEVOS_FIT.md` is outside the builder's surface. | the human | OPEN | T05 verdict |

## Triage proposed at T06 (G-Harden; the human signs by merging or amends)

| # | CF | Proposed disposition | Reason | The human decides |
|---|---|---|---|---|
| 1 | CF-001 | MAINTENANCE | SECURITY_MODEL §2 accepts `'unsafe-inline'` for the pilot; a nonce-based CSP is post-freeze work | sign MAINTENANCE by merging, or amend |
| 2 | CF-002 | ACCEPT or FIX-DOC | the redirect response has no body; every page and 404 response carries the six headers | choose ACCEPT, or FIX-DOC (amend SECURITY_MODEL §2) |
| 3 | CF-003 | FIX-DOC | applied in T06 | sign the applied correction by merging, or amend |
| 4 | CF-004 | MAINTENANCE | every `pnpm test` warns that `vitest.config.ts` is ESM loaded as CommonJS | sign MAINTENANCE by merging, or amend |
| 5 | CF-005 | ACCEPT | J9 hardening changes no appearance | accept as delivered, or a design amendment plus a new task |
| 6 | CF-006 | FIX-DOC | `DEVOS_FIT.md` is outside the builder surface; the brief is signed | the human applies the document correction |

The freeze OD (Dev OS v2 §J9) is not in docs/DECISIONS.md; the human signs one or records that the pilot needs none.
