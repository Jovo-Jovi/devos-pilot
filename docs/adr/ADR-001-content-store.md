# ADR-001 — Content store is version-controlled JSON

**Status:** Accepted, 2026-10-10 (D-01). Superseded for `LibraryNotice` and `OpeningSlot` by ADR-002
(OD-10, DRAFT until the intake PR for issue #14 merges); it still holds for `LibraryProfile`.
**Deviation from:** Dev OS v2 §9 (Supabase Postgres)

## Context

The pilot tests the automated method, not the stack. A database adds RLS, keys, MCP write policy
and migrations, all risk-3 work that would dominate a six-task pilot.

## Decision

`LibraryProfile`, `OpeningSlot` and `LibraryNotice` live in `content/*.json`, read on the server at
build time and validated with a schema. There is no write path.

## Consequences

- No RLS, no service key, no Supabase MCP. The Boundary gate is trivially easier to prove.
- Moving to Supabase later is a new OD and starts at J2 with `DATA_MODEL.md`.
