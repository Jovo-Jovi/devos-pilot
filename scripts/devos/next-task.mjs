#!/usr/bin/env node
// Resolve which task the runner works on, and everything the workflow needs to know about it.
// Usage: node scripts/devos/next-task.mjs [--task T01] [--attempt 1]
import { parsePhases, nextOpenTask, isHumanGate, reviewerModel, taskAfter, config, emit, fail } from "./lib.mjs";

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] ?? "").trim() : "";
};

const cfg = config();
const { rows } = parsePhases();
const wanted = arg("task");
const attempt = Number(arg("attempt") || "1");

if (!Number.isInteger(attempt) || attempt < 1) fail(`invalid attempt "${arg("attempt")}"`);
if (attempt > cfg.max_attempts) fail(`attempt ${attempt} exceeds max_attempts ${cfg.max_attempts}`);

const row = wanted ? rows.find((r) => r.task === wanted) : nextOpenTask(rows);
if (wanted && !row) fail(`task ${wanted} is not in docs/PHASES.md`);
if (!row) {
  emit({ done: "true", task: "", reason: "every task in docs/PHASES.md is ticked" });
  process.exit(0);
}
if (row.done) fail(`task ${row.task} is already ticked PASS in docs/PHASES.md`);

// Previous rows must be done: one task at a time, in order (Dev OS §7).
const earlierOpen = rows.slice(0, rows.indexOf(row)).find((r) => !r.done);
if (earlierOpen) fail(`task ${row.task} cannot start: ${earlierOpen.task} is not PASS yet`);

const next = taskAfter(rows, row.task);
emit({
  done: "false",
  task: row.task,
  name: row.name,
  risk: row.risk,
  gate: row.gate,
  human_gate: isHumanGate(row) ? "true" : "false",
  attempt,
  max_attempts: cfg.max_attempts,
  branch: `${cfg.branch_prefix}${row.task}`,
  builder_model: cfg.builder.model,
  reviewer_model: reviewerModel(row, cfg),
  reviewer_max_turns: cfg.reviewer.max_turns,
  next_task: next ? next.task : "",
});
