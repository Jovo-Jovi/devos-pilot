# PILOT — Scope

Precedence 2, with `DECISIONS.md`. Derived from OD-01 to OD-06 (there is no quotation: the pilot
has no client and no price).

## 1. Scope as signed (baseline, 2026-10-10)

| # | Deliverable | Station | Task |
|---|---|---|---|
| S-1 | App shell: locales `ar`/`en`, RTL/LTR from the URL, tokens, catalogues, checks | J4 | T01 |
| S-2 | Security-header baseline | J4 | T02 |
| S-3 | Home page: library name, opening hours, latest notices, footer with contact | J5 | T03 |
| S-4 | Notices page: every published `LibraryNotice`, newest first | J5 | T04 |
| S-5 | Rendered evidence in both locales (Playwright) | J5 | T05 |
| S-6 | Inventory script and documents brought to the delivered state | J9 | T06 |

## 2. Out of scope

Accounts, dashboard, search, media library, forms of any kind, analytics, deployment, a custom
domain, a database. Anything else is out of scope until an OD adds it.

## 3. Amendments

None.

## 4. Delivered scope

Filled at T06 from `scripts/inventory.mjs` output.
