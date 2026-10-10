# PILOT — Product brief

**Status:** SIGNED with the bootstrap commit (OD-01). Precedence 1, with `GLOSSARY.md`.

## What it is

**Sanad Library Notices** is a bilingual (Arabic first, English second) public web page for a
*fictional* community library, Sanad Community Library (مكتبة سند المجتمعية). It shows:

1. the library's opening hours for the week, and
2. the library's published notices (closures, events, new arrivals), newest first.

There is no sign-in, no dashboard, no form and no database. Content comes from version-controlled
JSON files in `content/` that stand in for a content store (ADR-001).

## Why it exists

It is a **test project for the Dev OS v2 method run as an automated cycle**: Cursor (Grok 4.7,
high effort) builds each task, Claude Code reviews it from the repository, and a GitHub Actions
runner relays between them. The product is deliberately small, so the method, the gates and the
automation are what get tested, not the product.

## Users

- **Public visitors**, in Arabic or English. They only read. Nothing is collected about them.
- **The human** (Jiovanny) plays both the project owner and the client signatory (OD-02).

## Stack

Next.js App Router · TypeScript · CSS modules on one token stylesheet · pnpm · Vitest ·
Playwright. Deployable to Vercel later; deployment is out of scope for the pilot.

## Success criteria for the pilot

- All six tasks in `docs/PHASES.md` reach PASS through the automated cycle.
- At least one task halts or fails and is recovered by a reissued fence.
- Every human gate (T02, T05, T06) stops the cycle and waits for the human's merge.
- The guards, the reviewer's surface limits and the builder's surface limits are never bypassed.
