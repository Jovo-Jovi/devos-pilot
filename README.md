# devos-pilot — Dev OS v2, run as an automated Cursor ⇄ Claude cycle

**Status: finished on 2026-10-16.** All 25 tasks in 6 phases passed and production is deployed.

The product was only a test bed: **Sanad Library Notices**, a fictional bilingual Arabic/English
library site with a staff editor. It existed to prove the method end to end on a real full-stack
build. This repository is now the **reference implementation** to copy for the next project
([below](#using-it-for-the-next-project)).

---

## The method in brief

> The human owns **decisions**. Documents own **truth**. The reviewer owns **verdicts**. The
> builder owns **execution**. Nothing ships without a written, verified gate, and nothing starts
> before the thing it depends on has arrived.
> — the handbook, [`docs/method/DEV_OS_V2_REVIEWER.md`](docs/method/DEV_OS_V2_REVIEWER.md)

**The five pillars** (handbook §1):

1. **Written, signed scope.** Every scope question becomes a numbered decision (an OD) before any
   code that depends on it.
2. **Documents in precedence order.** When two documents conflict, the higher one wins or a formal
   amendment is written. Conflicts are never quietly smoothed over. The order is in
   [`CLAUDE.md`](CLAUDE.md).
3. **Roles that never overlap.** The reviewer never writes product code. The builder never invents
   scope. The human decides.
4. **Gates with written PASS/FAIL verdicts, computed from the repository.** A pasted report never
   counts as evidence.
5. **Dependencies first.** Design is approved before pages are built, and content arrives before
   the features that show it.

### Who does what

| Role | Who | Owns | Never |
|---|---|---|---|
| **Human** | you | decisions (ODs), the merge at every gate, accounts and secrets | merges before a verdict; puts a secret in a file or a chat |
| **Builder** | Grok 4.7 in the Cursor CLI | code, tests, migrations, its report | invents scope, runs git, edits fences or reviews |
| **Reviewer** | Claude Code: Sonnet 5.5 for light reviews, Opus 5.5 for deep reviews and planning | fences, verdicts, plans for requests and method fixes | writes product code (it may change only `docs/reviews/**` and `docs/fences/**`) |
| **Runner** | GitHub Actions + `scripts/devos/` | git, PRs, labels, statuses, the ledger | decides a verdict on its own (it applies `verdict.mjs`) |

### The words

| Word | Meaning | Lives in |
|---|---|---|
| **OD** | A signed decision. Scope exists only if an OD or the scope document says so. | `docs/DECISIONS.md`, `docs/SCOPE.md` |
| **Fence** | One self-contained task prompt with preconditions, steps, *Done when*, tests and *Do NOT*. It carries the builder's effort, from low to xhigh. | `docs/fences/Tnn.md` |
| **Report** | The builder's claim, with real command outputs | `docs/reports/Tnn.md` |
| **Verdict** | The reviewer's PASS or FAIL for each *Done when* row, judged from the tree | `docs/reviews/Tnn-aN.md` |
| **Gate** | A point only your merge can pass: risk 3, a named gate, a migration, a rules file or a method change | Gate column of `docs/PHASES.md` |
| **Ledger** | The task table. Only the runner writes Done and Verdict. | `docs/PHASES.md` |
| **Precedent (PR)** | A binding rule, usually learned from an incident | `docs/method/PRECEDENTS.md` |
| **Carry-forward (CF)** | A finding kept with an owner until it lands | `docs/method/CARRY_FORWARDS.md` |
| **Boundary gate** | Proof that no visitor data is accepted or kept outside a declared zone. It cannot be waived. | `docs/BOUNDARY_MODEL.md` |

### Rules that never bend

- **Fetch, never paste.** The tree is the evidence; a report is only a claim (PR-02).
- **Red checks override PASS** (PR-08), and **nothing merges before its verdict** (PR-13).
- **Agents never hold a git credential** (PR-04). **No secret ever enters a file**, and no workflow
  receives every secret at once (PR-32, PR-33).
- **A usage limit is a wait, not a failure.** The run switches account, or parks and resumes
  (PR-12, PR-29, PR-31).
- **The automation is repaired through the same cycle**, with a deep review and your merge (PR-28).

---

## How the automation runs it

```
 you open the issue form "Dev OS change request"
        │
        ▼
 devos-intake: Claude plans it ──► intake PR (draft OD, PHASES rows, first fence, settings needed)
        │ your merge signs the OD
        ▼
 ┌──────────────── devos-cycle: one run = one attempt of one task ─────────────────┐
 │ next task from PHASES.md → Grok builds on task/Tnn with local Supabase, R2 and  │
 │ Firestore running → surface guard → PR → every check → evidence pack →         │
 │ Claude reviews (light or deep) → verdict.mjs decides → ledger updated           │
 └────┬──────────────┬─────────────────┬────────────────┬──────────────────┬──────┘
      │ PASS,        │ PASS at a       │ FAIL,          │ usage limit      │ a setting
      │ no gate      │ gate            │ attempts left  │                  │ is missing
      ▼              ▼                 ▼                ▼                  ▼
  auto-merge,    waits for your    reissued fence,  other account,    "setup needed"
  next task      merge, then       next attempt     or park and       issue lists it;
                 next task                          resume at reset   resumes when added

 a merge you make to main ──► devos-deploy: backup → migrations → Firestore rules + seed
                              → app upload → smoke test
```

Before you merge a gate PR, check its three statuses: **`devos/checks`**, **`devos/verdict`** and
**`devos/gate`**. A `ci` result that appears after the merge belongs to `main`, not to the PR.

**Everything the machine does** is in the operating manual,
[`docs/method/AUTOMATION.md`](docs/method/AUTOMATION.md). It covers:

- every flow, workflow, script, guard, label, status and variable;
- what happens when something fails;
- how to change the automation safely.

`guard:manual` fails any change that leaves the manual behind.

## Your part

1. **Ask for work** with the "Dev OS change request" issue form. Answer the planner's questions on
   the issue, then merge the intake PR to sign its decision.
2. **Merge PRs labelled `devos:human-gate`** once `devos/gate` is green. That merge is your sign-off.
3. **Add what the "Dev OS: setup needed" issue lists.** Waiting runs then resume by themselves.
4. **If the automation misbehaves, or you want it to work differently**, open a "Dev OS method fix"
   issue with the run link. Or run `claude` here and type `/devos-method <what went wrong>`.
5. **To stop everything**, set the repository variable `DEVOS_PAUSED` to `true`.

---

## What the pilot proved

| | |
|---|---|
| Time | 2026-10-10 to 2026-10-16 (7 days), 134 commits |
| Work | 25 tasks in 6 phases; 3 change requests planned by intake (issues #7, #14, #26) |
| Quality | 25 of 25 PASS: 20 on the first attempt, 34 attempts in all |
| Your merges | 16 tasks stopped for you (risk 3 or a named gate); 9 merged themselves |
| Decisions | 11 ODs, 3 ADRs |
| Rules learned | 33 precedents; PR-11 to PR-33 came from incidents during the run |
| Stack | Next.js 16.4 · Supabase (Postgres with RLS; staff sign-in with TOTP) · Cloudflare R2 · Firestore · Vercel |

| Phase | What | Tasks | Gate |
|---|---|---|---|
| P01 | Foundation: app shell, locales, tokens, security headers | T01–T02 | G-Foundation |
| P02 | Public pages, with rendered proof in both locales | T03–T05 | G-Public |
| P03 | Inventory; documents brought to the delivered state | T06 | G-Harden |
| P04 | Design v2 (OD-09) | T07–T10 | G-Design-v2 |
| P05 | Staff editor on Supabase (OD-10) | T11–T18 | G-Staff-editor |
| P06 | Book types from Firestore, covers in R2 (OD-11) | T19–T25 | G-Book-types |

How these were counted:

```
grep -cE '^\| T[0-9]+ ' docs/PHASES.md
grep -cE 'PASS a1 ' docs/PHASES.md
git rev-list --count HEAD
```

**Left open at the end.** None of these blocks anything; they are inputs for the next project's
foundation.

- **CF-001:** nonce-based CSP.
- **CF-002:** headers on the `/` redirect.
- **CF-004:** a Vitest ESM warning.
- **CF-006:** the brief still says CSS modules.
- **Fonts** are still fetched from Google at build time (PR-24).

---

## Using it for the next project

1. Create a new **private** repository.
2. **Copy the method from here:**
   - `scripts/devos/` and `scripts/guards/`
   - `devos/`
   - `.github/workflows/` and `.github/ISSUE_TEMPLATE/`
   - `.cursor/`
   - `.claude/commands/`
   - `devos.config.json`
   - `docs/method/`: the handbook, `FULLSTACK_MODULE.md`, `AUTOMATION.md` and `PRECEDENTS.md`.
     Keep the precedents: they are the rules the runner implements.
3. Run `claude` in the new repository and type `/devos-new-project <one-paragraph brief>`. It does
   the fit research and writes the documents, the ODs, `PHASES.md` and fence T01.
4. Copy `.claude/settings.json` **last**. It locks the reviewer to reviews and fences.
5. Follow [`SETUP.md`](SETUP.md): accounts, secrets and variables. Then push the bootstrap; that
   push signs the ODs.
6. Run `devos-cycle`. From then on, the [steps above](#your-part) are your whole job.

---

## Map

| Path | What |
|---|---|
| [`docs/method/DEV_OS_V2_REVIEWER.md`](docs/method/DEV_OS_V2_REVIEWER.md) | The method: pillars, journey J0–J11, documents, governance, gates, templates |
| [`docs/method/AUTOMATION.md`](docs/method/AUTOMATION.md) | The operating manual of the automated cycle |
| [`docs/method/PRECEDENTS.md`](docs/method/PRECEDENTS.md) | Binding rules PR-01…PR-33, each with the incident it came from |
| [`docs/method/FULLSTACK_MODULE.md`](docs/method/FULLSTACK_MODULE.md) | Database, storage and Firestore modules: local copies, checks, deploy order |
| [`docs/method/DEVOS_FIT.md`](docs/method/DEVOS_FIT.md) | How the method was fitted to this project, including the Cursor tooling review |
| [`SETUP.md`](SETUP.md) | Accounts, secrets, variables, modules, two accounts per agent |
| [`CLAUDE.md`](CLAUDE.md) · `.cursor/rules/` | The reviewer's rules · the builder's rules |
| `devos.config.json` | Models, efforts, attempts, required checks, who may edit what, modules, waits |
| `docs/PHASES.md` · `docs/DECISIONS.md` · `docs/SCOPE.md` | The ledger · the ODs · the scope |
| `docs/fences/` · `docs/reports/` · `docs/reviews/` · `docs/requests/` | Every task's prompt, claim, verdict and request plan |
| `devos/` · `scripts/devos/` · `scripts/guards/` · `.github/workflows/` | Prompts and settings list · runner · build-failing guards · workflows |
| `.claude/commands/` | `/devos-review Tnn`, `/devos-method`, `/devos-new-project` |
