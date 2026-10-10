#!/usr/bin/env node
// Render the builder or reviewer prompt for a task attempt from devos/prompts/*.md.
// Usage: node scripts/devos/render-prompt.mjs builder|reviewer T01 1 [--out file]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { P, parsePhases, isHumanGate, taskAfter, config, fail } from "./lib.mjs";

export function renderPrompt(role, task, attempt) {
  const cfg = config();
  const { rows } = parsePhases();
  const row = rows.find((r) => r.task === task);
  if (!row) fail(`render-prompt: ${task} not in docs/PHASES.md`);
  const next = taskAfter(rows, task);
  const prevReview = `docs/reviews/${task}-a${attempt - 1}.md`;
  const hasPrev = attempt > 1 && existsSync(P(prevReview));

  const vars = {
    TASK: task,
    NAME: row.name,
    RISK: String(row.risk),
    GATE: row.gate,
    ATTEMPT: String(attempt),
    ATTEMPT_NEXT: String(attempt + 1),
    MAX_ATTEMPTS: String(cfg.max_attempts),
    BRANCH: `${cfg.branch_prefix}${task}`,
    BASE: cfg.base_branch,
    NEXT_TASK: next ? next.task : "",
    NEXT_TASK_OR_NONE: next ? next.task : "none (last task)",
    HUMAN_GATE: isHumanGate(row) ? "yes — the PR waits for the human's merge" : "no — the runner merges a PASS",
    BUILDER_MODEL: cfg.builder.model,
    REISSUE_BLOCK: hasPrev
      ? `\nThis is a REISSUE. Read the previous verdict \`${prevReview}\` and the fence's "Attempt ${attempt} focus" section first. The earlier attempt's work is already in the tree on this branch: verify it against the Done-when list and change only what fails. Never redo or duplicate it.\n`
      : "",
    PREV_REVIEW_LINE: hasPrev ? `- \`${prevReview}\`: your previous verdict on this task.\n` : "",
    RISK3_LINE: row.risk >= 3
      ? "This is **risk 3**: you are the heavyweight review (Dev OS §11). Read every changed line, not a sample."
      : "",
  };

  const tpl = readFileSync(P(`devos/prompts/${role}.md`), "utf8");
  const out = tpl.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, k) => {
    if (!(k in vars)) fail(`render-prompt: unknown placeholder {{${k}}} in devos/prompts/${role}.md`);
    return vars[k];
  });
  return out;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("render-prompt.mjs")) {
  const [role, task, attemptRaw] = process.argv.slice(2);
  if (!["builder", "reviewer"].includes(role) || !/^T\d{2}$/.test(task ?? "")) {
    fail("usage: render-prompt.mjs builder|reviewer Tnn attempt [--out file]", 2);
  }
  const text = renderPrompt(role, task, Number(attemptRaw || "1"));
  const oi = process.argv.indexOf("--out");
  if (oi >= 0) writeFileSync(process.argv[oi + 1], text);
  else process.stdout.write(text);
}
