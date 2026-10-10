# PILOT — Dev OS fit research

**Status:** APPROVED with the bootstrap commit (the human's push is the approval; OD-01 to OD-06)
**Authored by:** the reviewer (Claude), first session, 2026-10-10 (Dev OS v2 §17)
**Rule:** every fact is cited or marked **assumption**.

---

## 1. Purpose and users

A test project for running Dev OS v2 as an automated builder/reviewer cycle (PRODUCT_BRIEF.md).
Public visitors read a bilingual notices-and-hours page for a fictional library. The human plays
owner and client. Nothing exists today; there is no legacy system.

## 2. Profile

**A** — public bilingual site. No dashboard (dropped from Profile A because the pilot has no staff
publishing; recorded in §9).

## 3. Data classification

| Data | Personal? | Special category? | Who may see it | Retention |
|---|---|---|---|---|
| `LibraryProfile` (name, address, phone of the library) | no — business data | no | public | while published |
| `OpeningSlot` | no | no | public | while published |
| `LibraryNotice` | no | no | public (published only) | while published |
| Visitor data of any kind | — | — | **never collected** (Boundary gate) | — |

No "yes" in column two: Profile A stands.

## 4. Layers and modules

| Layer or module | Decision | Why | Gate or document |
|---|---|---|---|
| Public pages, bilingual RTL | **Include** | the product | I18N_MODEL, DESIGN_SYSTEM |
| Operator / staff dashboard | **Omit** | content is JSON in the repo | §9 |
| Partner or member area | **Omit** | no accounts | — |
| Staff authentication with MFA | **Omit** | no accounts | — |
| Role hierarchy in the database | **Omit** | no database (ADR-001) | — |
| Audit trail | **Omit** | Profile A, no writes | — |
| Search | **Omit** | 3–10 notices; not worth J8 | — |
| Media library | **Omit** | text only | — |
| File uploads | **Omit** | Boundary gate | — |
| Announcements or news | **Adapt** | `LibraryNotice` from JSON, not a dashboard | CONTENT_MODEL |
| Email or notifications | **Omit** | out of scope | — |
| Payments | **Omit** | out of scope | — |
| Reports and exports | **Omit** | out of scope | — |
| Legacy data migration | **Omit** | none exists | — |
| Integrations with existing systems | **Omit** | none exist | — |
| Offline or mobile app | **Omit** | out of scope | — |
| **Automation runner** (new) | **Include** | the subject of the pilot | OD-03, `.github/workflows/devos-*.yml` |

## 5. Obligations

- Egypt's Personal Data Protection Law (Law 151 of 2020) applies to processing personal data; the
  pilot processes none, so it places no requirement beyond the Boundary gate. **Assumption:** no
  legal review needed for a fictional, data-free pilot.
- Accessibility: WCAG 2.1 AA is a target, checked informally at T05 (semantic headings, table
  headers, contrast from tokens). Not a gate in the pilot.

## 6. Existing estate

None. No domain, DNS, mail or host. Nothing to inventory; J0's estate inventory is recorded as
"empty" and J10 cutover is omitted.

## 7. Stack fit

Next.js App Router + TypeScript + CSS modules + pnpm + Vitest + Playwright fits the human's standard
stack, minus Tailwind/shadcn (Dev OS §9 prescribes one token stylesheet with CSS modules so
`guard:design` can enforce logical properties). Supabase replaced by JSON (ADR-001). Vercel-ready,
not deployed.

### 7a. Tooling review — Cursor marketplace (cursor.com/marketplace, read 2026-10-10)

The marketplace lists plugins that bundle MCP servers, skills, rules, commands and hooks, plus
"automations" that act on triggers. Each candidate was weighed against the Boundary gate and the
rule that a tool is never authority (Dev OS §7).

| Plugin / item | Decision | Reason |
|---|---|---|
| **Context7** (Upstash; version-specific docs MCP) | **Include**, all runs, read-only | Grok needs current Next.js App Router APIs (params as Promise, redirects, not-found); docs lookups carry no data out |
| **Playwright** (browser MCP) | **Include**, IDE only | rendered evidence in both locales while composing; CI runs Playwright as tests, not as MCP |
| GitHub | **Omit for the builder** | the runner owns git (PR-04); the builder must not open or merge PRs |
| Vercel | **Omit for now** | no deployment in scope; revisit with a deploy OD |
| Supabase | **Omit** | no database (ADR-001) |
| PostHog, Sentry (browser) | **Omit** | trackers and error beacons would breach the Boundary gate |
| shadcn/ui | **Omit** | DESIGN_SYSTEM uses CSS modules on tokens |
| Superpowers, Compound Engineering | **Omit** | workflow skills that compete with the fence as the task's whole authority |
| Automations: "Fix CI failures", "Triage failed GitHub Actions", "Add test coverage" | **Omit** | they act without a fence and outside the reviewer's verdict |

Model availability (cursor.com/docs/models, read 2026-10-10): Grok 4.7 is in the Cursor Models pool;
model id `grok-4.7`; effort levels xhigh/high/medium/low with **high the default**; 256k context.
The Cursor CLI exposes `--model` but no effort flag, so the default high applies.

## 8. Gates for this project

- **Non-waivable:** Boundary gate (BOUNDARY_MODEL.md).
- **Station gates:** G-Design (PASS at bootstrap, OD-02), **G-Foundation** (closes with T02),
  **G-Public** (closes with T05), **G-Harden** (closes with T06). Each stops the cycle for the
  human's merge.
- **Risk-3 heavyweight review:** T02 (security headers), reviewed by Claude Opus 5.5.

## 9. Deviations from the Dev OS

1. **Automated relay** (OD-03): the runner, not the human, carries fences and reports, opens PRs,
   and merges risk-1/2 PASSes that close no gate. Reason: the pilot's purpose.
2. **Verdict recording** moves from "the next task's first step" (§5.5) to the runner's record
   step, so it is mechanical and cannot drift.
3. **Rehearsal** (§6.2) happens inside the review run on the task branch, before the next fence is
   written; there is no separate clean-clone rehearsal session.
4. **J0–J3 compressed** into the bootstrap; the human signs as client (OD-02).
5. **J6, J7, J8, J10 omitted** (no dashboard, client content is synthetic, no search, no cutover).
6. **Profile A without a dashboard.**
7. **Supabase replaced by JSON** (ADR-001); `guard:schema` and `verify_seed` dropped, a content
   schema check at build replaces them.
8. **Carry-forward triage** at G-Harden only (three gates is too few to triage each).

## 10. Questions for the human

None block the build. Setup inputs (GitHub owner, Cursor API key, Claude auth method) are in
`SETUP.md`.

## 11. Sign-off

Approved by the human's push of the bootstrap commit. Every later OD that changes profile, layers
or gates amends this file.
