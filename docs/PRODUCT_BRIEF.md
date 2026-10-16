# PILOT — Product brief

**Status:** SIGNED with the bootstrap commit (OD-01). Amended by OD-10 (staff editor, issue #14) and
OD-11 (book types and covers, issue #26), each DRAFT until its intake PR merges. Precedence 1, with
`GLOSSARY.md`.

## What it is

**Sanad Library Notices** is a bilingual (Arabic first, English second) public web page for a
*fictional* community library, Sanad Community Library (مكتبة سند المجتمعية). It shows:

1. the library's opening hours for the week, and
2. the library's published notices (closures, events, new arrivals), newest first.

Visitors never sign in, fill in a form or give anything.

Under OD-10, library staff, invited by the human, sign in to a small staff area at `/[locale]/staff`.
They use an email address, a password and an authenticator code. There they publish notices and edit
the weekly opening hours. Notices and opening hours live in a Supabase Postgres database (ADR-002).
The library's name, address and phone stay in a version-controlled JSON file in `content/` (ADR-001).

Under OD-11, a third page, `/[locale]/book-types`, lists the kinds of book the library holds, read
from Cloud Firestore and seeded from the repository. Staff can give each type a cover image, which is
stored in Cloudflare R2 (ADR-003).

## Why it exists

It is a **test project for the Dev OS v2 method run as an automated cycle**: Cursor (Grok 4.7,
high effort) builds each task, Claude Code reviews it from the repository, and a GitHub Actions
runner relays between them. The product is deliberately small, so the method, the gates and the
automation are what get tested, not the product.

## Users

- **Public visitors**, in Arabic or English. They only read. Nothing is collected about them.
- **Library staff** (OD-10), by invitation only. They publish notices and edit opening hours in both
  languages, and (OD-11) upload, replace or remove the cover image of each book type. Their accounts hold an email address, a password hash and an authenticator factor, kept
  by Supabase Auth only.
- **The human** (Jiovanny) plays both the project owner and the client signatory (OD-02). They invite
  staff and grant the staff claim.

## Stack

Next.js App Router · TypeScript · CSS modules on one token stylesheet · pnpm · Vitest ·
Playwright. Supabase Postgres and Auth for notices, opening hours and staff accounts (OD-10, the
backend module, PR-17 to PR-19). Cloud Firestore for book types and Cloudflare R2 for their cover
images (OD-11, the storage and Firestore modules, PR-26). Deployed to Vercel (OD-08 §2). On every production deploy the
database moves before the app (PR-18).

## Success criteria for the pilot

- All six tasks in `docs/PHASES.md` reach PASS through the automated cycle.
- At least one task halts or fails and is recovered by a reissued fence.
- Every human gate (T02, T05, T06) stops the cycle and waits for the human's merge.
- The guards, the reviewer's surface limits and the builder's surface limits are never bypassed.
