# PILOT — Decisions

Precedence 2, with `SCOPE.md`. A signed OD is never edited; a later OD amends it.
**Basis of signature for OD-01 to OD-06:** the human's push of the bootstrap commit to `main` is
the confirming act (2026-10-10).

---

### OD-01 — Pilot purpose, profile and boundary gate
**Status:** SIGNED — 2026-10-10 (bootstrap push)
**Amends:** none
**Requested by:** Jiovanny, 2026-10-10
**1.** PILOT is a test project for running Dev OS v2 as an automated builder/reviewer cycle.
**2.** Profile **A** (public bilingual site). No dashboard, no accounts.
**3.** The **Boundary gate is non-waivable**: no form, input, cookie, storage, tracker, analytics
script, log or route handler accepts or keeps visitor data.
**4.** No domain gate (no clinical, legal or regulated content).
**Does not decide:** deployment, domain, hosting plan.

### OD-02 — The human stands in for the client
**Status:** SIGNED — 2026-10-10 (bootstrap push)
**1.** The client is fictional. The human signs every client-signed gate (G-Scope, G-Design).
**2.** `DESIGN_SYSTEM.md` as committed in the bootstrap is the **approved design** (G-Design PASS).
**3.** The synthetic files in `content/` are the client's signed content for the pilot.
**Does not decide:** any real client engagement.

### OD-03 — Automated relay (amends Dev OS v2 §2 "the loop" for this project)
**Status:** SIGNED — 2026-10-10 (bootstrap push)
**Amends:** Dev OS v2 §2 loop, §5.5 verdict recording, §6.3 "the human opens and merges the PR"
**1.** The runner (`.github/workflows/devos-cycle.yml`, or `scripts/devos/loop.mjs` locally)
replaces the human as the relay: it hands the fence to the builder, commits and pushes the task
branch `task/Tnn`, opens the PR, runs the checks, hands the branch to the reviewer, validates the
verdict, and records it in `docs/PHASES.md`.
**2.** The reviewer still never writes code: it may change only `docs/reviews/**` and
`docs/fences/**`. The builder may not change the method surfaces listed in `devos.config.json`
`surfaces.builder.deny`. `scripts/devos/guard-surfaces.mjs` enforces both after every run.
**3.** **Auto-merge** only when all hold: verdict PASS · required checks green · risk 1 or 2 ·
the task's `Gate` cell is `—`.
**4.** **Human gate**: a PASS on a risk-3 task or on a task that closes a station gate stops the
cycle with the PR open and labelled `devos:human-gate`. The human's merge is the sign-off and
restarts the cycle.
**5.** A FAIL is retried with the reviewer's reissued fence, up to `max_attempts` (3). After that
the PR is labelled `devos:halted` and the cycle stops.
**6.** Kill switch: repository variable `DEVOS_PAUSED=true` stops the runner before any agent call.
**7.** A red required check turns a PASS into a FAIL, mechanically (PR-08).
**Does not decide:** a cycle for a real client project; that needs its own OD.

### OD-04 — Repository visibility
**Status:** SIGNED — 2026-10-10 (bootstrap push)
**1.** The repository is **private**. The reviewer verifies from the checked-out branch in the
runner, which satisfies "fetch, never paste".

### OD-05 — Models
**Status:** SIGNED — 2026-10-10 (bootstrap push)
**1.** Builder for every task: **Grok 4.7 in Cursor** (`grok-4.7`, effort high, which is its
default), through the Cursor CLI `agent`.
**2.** Reviewer: **Claude Sonnet 5.5** for risk 1–2; **Claude Opus 5.5** (heavyweight) for risk 3
and for every task that closes a station gate.
**3.** Model ids live in `devos.config.json`; changing them is a D-row, not an OD.

### OD-06 — Tooling from the Cursor marketplace review
**Status:** SIGNED — 2026-10-10 (bootstrap push)
**1.** Builder MCP servers: **Context7** (read-only documentation lookups) in every run;
**Playwright MCP** in the IDE only (rendered evidence). Nothing else.
**2.** Omitted, with reasons in `docs/method/DEVOS_FIT.md` §7a: PostHog, Sentry, Supabase,
Vercel, GitHub (for the builder), Superpowers, marketplace automations.
**3.** A connected tool is not permission. A fence names the calls it allows.

---

## D-rows

| D | Decision | Date |
|---|---|---|
| D-01 | Content store is JSON in `content/` (ADR-001) | 2026-10-10 |
| D-02 | Default locale `ar`; `/` redirects to `/ar` (fixed, never detected) | 2026-10-10 |
