# SETUP — link Cursor, Claude Code and GitHub, then start the cycle

About 30–40 minutes the first time. Commands are shown for **Windows PowerShell** (your machine) and
for macOS/Linux where they differ. Nothing in this repository holds a secret; every key goes into
GitHub Actions secrets.

---

## 0. What you need

| Account / tool | Why | Notes |
|---|---|---|
| GitHub (`Jovo-Jovi`) + `gh` CLI | private repo, Actions, PRs | `winget install GitHub.cli`, then `gh auth login` |
| Cursor **Pro or higher** | builder: Grok 4.7 via the Cursor CLI | the India-only *Start* plan fixes Grok at medium effort |
| Claude **Pro / Max** (or a Console API key) | reviewer: Claude Code | subscription → `claude setup-token`; API → Console key |
| Node 22 + pnpm 10 + git | local checks, optional local loop | `npm i -g pnpm@10` |

---

## 1. Create the private repository (this push signs OD-01…OD-06)

```powershell
# in the unzipped devos-pilot folder
git init -b main
git add -A
git commit -m "B0: Dev OS bootstrap (signs OD-01..OD-06)"
gh repo create Jovo-Jovi/devos-pilot --private --source . --push
```

Pushing the bootstrap is the confirming act for the ODs and the fit file (`docs/DECISIONS.md`).
Read `docs/method/DEVOS_FIT.md` and `docs/DECISIONS.md` first if you want to change anything:
after the push, changes are new ODs.

---

## 2. Cursor (the builder)

1. **Install the Cursor CLI** (the binary is `agent`):
   ```powershell
   irm 'https://cursor.com/install?win32=true' | iex
   ```
   macOS/Linux/WSL: `curl https://cursor.com/install -fsS | bash`
2. **Log in and confirm the model id:**
   ```powershell
   agent login
   agent models
   ```
   Look for Grok 4.7. `agent models` lists it with the effort in the id: use **`grok-4.7-high`**
   in `devos.config.json` → `builder.model` (the CLI has no separate effort flag).
3. **Create a Cursor API key** for CI in the Cursor dashboard (cursor.com → Dashboard → API keys /
   Integrations → new user API key). Copy it for step 4.
4. **Open the folder in the Cursor IDE** (for manual work and watching):
   - Trust the workspace when asked, so `.cursor/hooks.json` runs.
   - Rules load from `.cursor/rules/` and skills from `.cursor/skills/` automatically.
   - MCP: either copy `.cursor/mcp.example.json` to `.cursor/mcp.json` (it is gitignored), **or**
     install the two marketplace plugins **Context7** and **Playwright** from
     Customize → Marketplace → Install → *project* scope. Do not install the others the fit file
     omits (`DEVOS_FIT.md` §7a): PostHog and Sentry would breach the Boundary gate, and the
     marketplace automations act without a fence.
   - In the model picker choose **Grok 4.7**, effort **High**.
   - Check: `agent mcp list` shows `context7`.

---

## 3. Claude Code (the reviewer)

1. **Install and log in:**
   ```powershell
   npm install -g @anthropic-ai/claude-code
   claude            # first run opens the browser login; then /exit
   ```
2. **Make a CI credential** (pick one):
   - Subscription: `claude setup-token` → approve in the browser → copy the printed token
     (valid one year). This becomes `CLAUDE_CODE_OAUTH_TOKEN`.
   - API billing: create a key at platform.claude.com. This becomes `ANTHROPIC_API_KEY`.
3. **Optional, recommended:** inside `claude` in this repo run `/install-github-app`. The cycle does
   not need it, but it lets you write `@claude …` on any PR to ask the reviewer questions.

---

## 4. GitHub settings

```powershell
gh secret set CURSOR_API_KEY --repo Jovo-Jovi/devos-pilot
gh secret set CLAUDE_CODE_OAUTH_TOKEN --repo Jovo-Jovi/devos-pilot   # or: gh secret set ANTHROPIC_API_KEY ...
gh variable set DEVOS_PAUSED --body false --repo Jovo-Jovi/devos-pilot
```
(each `secret set` prompts for the value, so it never lands in your shell history)

Then in **Settings → Actions → General → Workflow permissions**:

- select **Read and write permissions**, and
- tick **Allow GitHub Actions to create and approve pull requests** (the runner opens the PRs).

**Branch protection on `main`:** for the pilot, leave "require approvals" off, because the runner
merges risk-1/2 PASSes itself. If you want protection anyway, create a fine-grained PAT (this repo
only; Contents, Pull requests, Actions: read/write), store it as `DEVOS_PAT`, and allow it to bypass.
`DEVOS_PAT` also makes the plain `ci` workflow run on the runner's PRs.

---

## 5. Optional local checks before the first run

```powershell
node scripts/guards/run-all.mjs        # secrets, phases PASS; src-based guards N/A until T01
node scripts/devos/next-task.mjs       # task=T01, builder_model=grok-4.7, reviewer_model=claude-sonnet-5-5
```

Local loop instead of Actions (macOS, Linux or WSL; it uses your logged-in `agent` and `claude`):
`node scripts/devos/loop.mjs --task T01` (add `--push` to push branches and main).

---

## 6. Start the cycle

GitHub → **Actions → devos-cycle → Run workflow** (leave both inputs blank), or:

```powershell
gh workflow run devos-cycle.yml --repo Jovo-Jovi/devos-pilot
```

What you will see:

| Step | Task | What happens | Your action |
|---|---|---|---|
| 1 | T01 Foundation (risk 2) | Cursor builds, Claude reviews, PASS → **auto-merge**, T02 dispatched | none |
| 2 | T02 Security headers (risk 3, G-Foundation) | Opus 5.5 heavyweight review → PR labelled `devos:human-gate` | read the verdict comment and `docs/reviews/T02-a1.md`, then **merge** |
| 3 | T03, T04 (risk 2) | auto-merge each | none |
| 4 | T05 Rendered evidence (G-Public) | PR waits | look at the Playwright screenshots in the run artifacts, **merge** |
| 5 | T06 Inventory + docs (G-Harden) | PR waits | sign the carry-forward triage by **merging** |

Every merge you make triggers `devos-advance`, which dispatches the next task. On a FAIL the runner
dispatches the reissued fence (attempt 2, then 3) on the same branch.

---

## 7. Watching and stepping in

- **Labels:** `devos:human-gate` (your turn), `devos:halted` (needs a decision), `devos:quota-wait`
  (parked on a usage limit; resumes by itself), `devos:auto-merged`.
- **Each PR comment** holds the verdict summary; the full verdict is `docs/reviews/Tnn-aN.md`; the
  run's artifact `devos-Tnn-aN` holds the prompts, agent outputs and check logs.
- **Pause everything:** `gh variable set DEVOS_PAUSED --body true`. Resume with `false`, then run
  the workflow.
- **After a halt:** read the comment, fix the cause (or edit the fence yourself on the branch), then
  run the workflow with `task=Tnn` and `attempt=1`. It continues on the same branch.
- **Reviewer or infrastructure failure** (no verdict file, auth error, refused tool calls): run the
  workflow with `task=Tnn`, the same `attempt`, and **`review_only` ticked**. Only Claude runs again;
  the builder's commit is kept (PR-11).
- **Plan or rate limits (PR-12):** if Cursor or Claude runs out of usage, the PR gets
  `devos:quota-wait`, nothing is marked failed, and the hourly **devos-resume** workflow retries
  the same task and attempt (review-only when only Claude was blocked) until it goes through. To
  stop the retries, remove the label; to retry immediately, run devos-resume by hand.
- **"1 workflow awaiting approval" on a runner PR:** that is the plain `ci` workflow. GitHub holds
  runs on PRs opened by the Actions bot until someone approves them. Approving only runs the checks
  again; the cycle already ran them, so you can approve or ignore it.
- **Manual mode for any task** (the classic Dev OS loop): in the Cursor IDE, check out `task/Tnn`
  and send *"Read docs/SESSION_CONTEXT.md and docs/method/PRECEDENTS.md, then execute
  docs/fences/Tnn.md."* Then run `claude` in the repo and use `/devos-review Tnn`.

## 8. Where the Claude app fits

The cycle runs on **Claude Code** because it can be scripted (`claude -p`) in GitHub Actions; a
chat in the Claude app cannot be triggered by a workflow. Use the Claude app alongside it for
what needs you: discuss a halted verdict, draft a new OD, or plan the next project. With GitHub
connected, it can read the PRs and verdict files directly.

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `agent: command not found` in Actions | the install path changed; check the install step's output and add that directory to `$GITHUB_PATH` |
| builder fails with an unknown model | run `agent models` and set `builder.model` in `devos.config.json` |
| reviewer exits at once with an auth error | the secret is missing or expired; regenerate with `claude setup-token` |
| "GitHub Actions is not permitted to create or approve pull requests" | step 4, the checkbox |
| merge refused | branch protection requires approvals; turn it off for the pilot or use `DEVOS_PAT` with bypass |
| `guard:surfaces(builder): FAIL` | the builder touched a method file; the run halts by design. Read the list, revert, re-run |
| a reviewer PASS shows as FAIL | PR-08: a required check was red. See the run's `ci-results.json` |

## 10. The next real project

Copy `.claude/commands/devos-new-project.md` to `~/.claude/commands/`. In a new repo with the
pilot's `scripts/`, `devos/`, `.github/workflows/` and the handbook copied in, run
`/devos-new-project <brief>`. It runs the fit research, **checks the Cursor marketplace and the
model list for that project**, writes the documents and the first fence, and hands you the ODs to
sign.

---

## 11. Automation v3 (OD-07, OD-08)

### 11.1 Builder effort and Fast mode, chosen per task
Claude writes the choice into each fence header: `- Builder: grok-4.7 · Effort: high · Fast: no`.
The runner turns it into a Cursor model id and checks it against `agent models`. To see the ids
Cursor offers, run `agent models` once and confirm the effort variants look like `grok-4.7-low`,
`grok-4.7-medium`, `grok-4.7-high`, `grok-4.7-xhigh` (and their Fast variants). If an id is not
listed, the run falls back to `builder.model` and says so on the PR. To override one run by hand:
Actions → devos-cycle → Run workflow → **effort** / **fast**.

### 11.2 Vercel
1. Install the CLI and link the repo once: `npm i -g vercel`, then in the repo `vercel link`
   (choose or create the project). This writes `.vercel/project.json` — **do not commit it**; copy
   `orgId` and `projectId` from it.
2. Create a token at vercel.com → Account Settings → Tokens.
3. Secrets and the switch:
   ```powershell
   gh secret set VERCEL_TOKEN --repo Jovo-Jovi/devos-pilot
   gh secret set VERCEL_ORG_ID --repo Jovo-Jovi/devos-pilot
   gh secret set VERCEL_PROJECT_ID --repo Jovo-Jovi/devos-pilot
   gh variable set DEVOS_VERCEL --body true --repo Jovo-Jovi/devos-pilot
   ```
4. If previews ask for a Vercel login (Deployment Protection), create a "Protection Bypass for
   Automation" secret in the Vercel project settings and store it as `VERCEL_AUTOMATION_BYPASS_SECRET`,
   so the reviewer and the screenshot step can open previews. You can still open previews yourself
   after logging in to Vercel on your phone.
5. Production: run Actions → **devos-deploy** once by hand. After that, every push to `main` that you
   make (gate merges included) deploys production; the runner's own auto-merges do not.

### 11.3 Change requests and revisions
- **New work:** GitHub → Issues → New issue → **Dev OS change request**. The reviewer replies on the
  issue: an intake PR to approve, questions (answer, then comment `/devos intake`), or a refusal with
  the reason. **Merging the intake PR signs its OD and starts the new tasks.**
- **Change a task in flight:** on its open PR, comment `/devos revise <what to change>`. Claude
  rewrites that task's fence and Cursor rebuilds it as the next attempt. Use this at a human gate
  instead of merging work you don't like.

### 11.4 Usage limits
When Cursor or Claude hits a limit, the PR gets `devos:quota-wait` and the comment shows the reset
time. If the reset is within about 5½ hours, the same run waits and resumes the task by itself — no
schedule involved. Longer waits are picked up by `devos-resume` (every 2 hours, best effort) or by
running it by hand. Removing the label cancels the wait. The waiting job uses Actions minutes while
it sleeps (up to ~330 per wait).

### 11.5 The UI redesign
The approved design is `docs/design/DESIGN_SYSTEM.v2.md` with the mockup `docs/design/mockup.html`
(open `mockup.html#en` for English). To build it, open a change request issue (text in the chat that
delivered this patch). The reviewer plans the tasks; each UI task is checked against screenshots at
desktop and phone widths, and the last one stops at gate `G-Design-v2` for your sign-off.

### 11.6 Protect `main` with the verdict (PR-13)
Settings → Branches → Add branch ruleset (or classic rule) for `main`: **Require status checks to
pass**, add `devos/verdict` (it appears after the first run that reports it). Leave "Require approvals"
off, and leave yourself able to bypass so you can still push method patches. After this, GitHub will
not let a task PR merge until Claude's verdict is PASS. Branch protection is free on public
repositories; on a private repository it needs GitHub Pro.

### 11.7 Before you merge: the gate doctor (PR-15)

You do not need to diagnose a red check yourself. On every task PR the **Dev OS gate doctor**
comment says what is wrong, whether it is the code or the environment, and who acts. Merge when the
commit status **`devos/gate`** is green. Comment `/devos doctor` to check again at any time.

| You see | What it means | What happens / what you do |
|---|---|---|
| ❌ ci checks, "environment (google-fonts / network / browser)" | The runner failed to download something; the code passed the cycle's own checks | Automatic: one re-run. If it fails again, merge on the verdict and file the prefilled change request (self-hosted fonts) the comment links |
| ❌ ci checks, "waiting for your approval" | GitHub holds `ci` on bot-opened PRs | Press **Approve and run** on the run; the doctor reports again when it finishes |
| ❌ ci checks, any other failure | Probably the task's code | Read Claude's second opinion in the comment, then paste its `/devos revise …` line as a comment, or press **Re-run failed jobs** if it calls it flaky |
| ⚠️ Vercel preview "Blocked" | Hobby teams only deploy commits authored by the owner | Fixed by PR-15 for new attempts. Does not block the merge |
| ⚠️ Vercel preview "behind the Vercel login" | Deployment Protection is on | Vercel → project → Settings → Deployment Protection → **Protection Bypass for Automation** → add a secret; GitHub → Settings → Secrets → Actions → `VERCEL_AUTOMATION_BYPASS_SECRET`. Until then screenshots come from the local build |
| ❌ Review verdict "no verdict on …" | Commits landed after the review | Actions → devos-cycle → Run workflow: the task, the last attempt, **review_only** ticked |
| ❌ Branch vs main "conflicts" | main changed under the task | **Resolve conflicts** on the PR, then `/devos doctor` |
| ⏳ anything | The runner is handling it (a re-run, a usage-limit wait) | Nothing; the comment updates itself |

The label `devos:needs-you` marks PRs where only you can act; filter the PR list by it.

### 11.8 Heavy runs and your plans (PR-20)
Some runs use much more of your Claude and Cursor plans than others: planning a change request, and
any task reviewed by Opus or at extra-high effort (risk 3 and gate tasks), or built at extra-high.
- **Subscribe** to the issue **"Dev OS: run notices"** (the runner opens it the first time). It
  comments there before each heavy run and when a phase starts, with the heavy tasks still ahead.
- To decide yourself when heavy work starts, set the repository variable `DEVOS_HEAVY` to `hold`.
  A heavy task then waits until you comment `/devos go` in that issue. Unset (or `notify`), it only
  announces. Retries and resumes of a task you already let start never wait.
- A usage limit never loses work: a task parks and resumes by itself (PR-12); a planning run keeps
  its partial plan and resumes by itself too. `/devos intake resume` continues one by hand.
- Mark small change requests "Small change" in the form: they are planned at high effort instead of
  extra-high, which costs noticeably less.
- Every verdict and plan comment ends with what the run cost (minutes, turns, tokens), so you can
  see which kinds of task are expensive.

## 12. Backend module: Supabase (PR-17 to PR-19)

The method side is already in the repository. The product side arrives through change requests,
so the order is: set up the hosted project, add the secrets, then file the requests.

### 12.1 A free Supabase organization and project for the pilot
1. supabase.com/dashboard → your organization menu → **New organization**, plan **Free**, name it
   `devos-pilot` (keeps the pilot away from any other organization and its bill).
2. In it, **New project** `devos-pilot`, region **Central EU (Frankfurt)** (next to Vercel's `fra1`).
   Generate a strong database password and keep it in your password manager.
3. Project Settings → General: copy the **Reference ID**. Project Settings → API keys: note the
   **publishable** and **secret** keys (they go into Vercel only, never into a file).
4. Account → **Access Tokens** → generate one named `devos-pilot deploy`.

### 12.2 GitHub secrets and variables
Settings → Secrets and variables → Actions:
- secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`;
- secret `DEVOS_BACKUP_PASSPHRASE`: a long random passphrase. Keep a copy offline: without it the
  encrypted backups cannot be opened;
- variable `DEVOS_SUPABASE` = `true`.

### 12.3 Vercel environment (Production only)
Vercel → project → Settings → Environment Variables, environment **Production**:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`
(mark it **Sensitive**). Leave Preview empty: previews are off while the module is active, and the
review uses the local build against the CI database instead (PR-18).

### 12.4 Auth settings in the hosted project
Authentication → Sign In / Providers: turn **off** "Allow new users to sign up" while only staff
have accounts (staff are invited from Authentication → Users → Invite). URL Configuration: Site URL
= the production URL. Multi-factor: enable TOTP when the data model requires AAL2 for writes.

### 12.5 Then file the change requests
Use the two prepared requests (staff editor first; visitor accounts after its gate is signed).
Each becomes an intake PR with its OD, data model and tasks; merging it signs the OD.

### 12.6 Before the visitor-accounts zone ships
Personal data from the public brings the Personal-Data Protection gate (handbook §10.3, PR-19):
make the repository **private** again (Settings → General → Danger zone). On a private repository,
branch protection for `devos/verdict` needs GitHub Pro; without it, keep merging only when
`devos/verdict` and `devos/gate` are green. Vercel previews and deploys keep working (PR-15, PR-16).

### 12.7 Things to know
- Free projects pause after a week without activity; a production deploy then fails at
  `supabase link` and says so. Restore the project in the dashboard and re-run `devos-deploy`.
- Each cycle run starts a local Supabase in Docker, adding a few minutes.
- To try the stack yourself: install the Supabase CLI and Docker, `supabase start`, `supabase db reset`.

