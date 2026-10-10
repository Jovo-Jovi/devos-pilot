# PILOT — Carry-forwards

Every finding becomes a row. The reviewer describes the row in a verdict; the landing task allocates
the id from the live maximum and reports it. **Live maximum: CF-003**.

Statuses: `OPEN` · `CLOSED at <task>` · `ACCEPTED at <task>` · `MAINTENANCE` · `HANDOVER`.

| CF | Item (finding, where, evidence) | Owner | Status | Lands at |
|---|---|---|---|---|
| CF-001 | Replace `'unsafe-inline'` in CSP `script-src` with a nonce-based CSP. Where: `next.config.ts:15`, SECURITY_MODEL §2 lines 24-25. Evidence: the probe's `content-security-policy` line. | the human schedules it (no task in `docs/PHASES.md` outlines carries it), triaged at T06 | OPEN | T02 verdict |
| CF-002 | The `/` 307 redirect response carries none of the six baseline headers: `node scripts/devos/probe.mjs --port 3100 /` prints only `location: /ar`. The implementation matches SECURITY_MODEL §2's own `source: "/:path*"`, and the response has no body. The human must decide whether §2's "every route" covers redirect responses and, if it does, amend §2 with the mechanism. | human decision, re-checked at T06 | OPEN | T02 verdict |
| CF-003 | DOC CORRECTION: `docs/DESIGN_SYSTEM.md` §3 lines 55-56 name catalogue keys `state.pending.hours` / `state.pending.notices`, but the catalogues (`src/i18n/messages/*.json`, fence T01 S5) use `state.pendingHours` / `state.pendingNotices`. The code is correct. The document should be amended to match. | T06 (documents brought to the delivered state) | OPEN | T02 verdict |
