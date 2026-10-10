# devos-pilot — Dev OS v2 as an automated Cursor ⇄ Claude cycle

A small test project (**Sanad Library Notices**, a fictional bilingual Arabic/English page) that
runs the Dev OS v2 method with no copy-paste between surfaces:

```
            ┌──────────────── GitHub Actions: devos-cycle (one run = one task attempt) ────────────────┐
 PHASES.md ─┤ resolve next task → Cursor CLI (Grok 4.7 high) builds on task/Tnn → surface guard →     │
 fence Tnn  │ commit · push · PR → checks (guards, typecheck, lint, test, build) → Claude Code reviews  │
            │ from the branch → surface guard → verdict.mjs (PR-08) → records PHASES.md                │
            └───────┬──────────────────────┬─────────────────────────┬─────────────────────┬──────────┘
                    │ PASS, risk 1–2,      │ PASS, risk 3 or gate     │ FAIL, attempt < 3   │ FAIL ×3 or
                    │ no gate              │                          │                     │ runner error
                    ▼                      ▼                          ▼                     ▼
             auto-merge + dispatch   PR waits: devos:human-gate   reissued fence →     devos:halted,
             next task               you merge = sign-off →       dispatch attempt+1   you decide
                                     devos-advance dispatches
```

- **Builder** (hands): Cursor CLI `agent`, model `grok-4.7` (high effort is its default). Rules in
  `.cursor/rules/`, skills in `.cursor/skills/`, hooks in `.cursor/hooks.json`, CLI permissions in
  `.cursor/cli.json`, MCP: Context7 (+ Playwright in the IDE).
- **Reviewer** (brain): Claude Code `claude -p`, Sonnet 5.5 for risk 1–2, Opus 5.5 for risk 3 and
  gate tasks. Instructions in `CLAUDE.md`, permissions in `.claude/settings.json` (it can only write
  `docs/reviews/**` and `docs/fences/**`).
- **Runner** (relay): `.github/workflows/devos-cycle.yml`, or `scripts/devos/loop.mjs` locally.
- **You** (decisions): sign the bootstrap by pushing it, and sign each gate by merging its PR.

**Start here: [`SETUP.md`](SETUP.md).**

## Map

| Path | What |
|---|---|
| `docs/method/DEVOS_FIT.md` | Fit research: profile, layers, Cursor marketplace tooling review, deviations |
| `docs/DECISIONS.md` | OD-01…OD-06 (OD-03 is the automation contract) |
| `docs/PHASES.md` | The task table the runner reads; six tasks, three human gates |
| `docs/fences/T01.md` | The first fence (rehearsed on Next.js 16.4) |
| `docs/reports/`, `docs/reviews/` | Builder reports, reviewer verdicts (filled by the cycle) |
| `devos.config.json` | Models, attempts, required checks, who may edit what |
| `devos/prompts/` | The builder and reviewer prompts the runner renders |
| `scripts/devos/` | Runner: next-task, render-prompt, run-checks, probe, guard-surfaces, verdict, loop |
| `scripts/guards/` | Build-failing guards: secrets, phases, naming, design, i18n, boundary, literals |
| `.claude/commands/` | `/devos-review Tnn` (manual review), `/devos-new-project` (bootstrap the next project) |
