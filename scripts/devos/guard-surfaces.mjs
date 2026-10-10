#!/usr/bin/env node
// Enforce who may change what (OD-03 §2, PR-07). Run right after an agent finishes, before the
// runner commits. Checks uncommitted changes (tracked and untracked; ignored files are skipped).
//
//   builder  → FAIL on any change to a denied path (the cycle halts; a human looks).
//   reviewer → the reviewer's own edit permissions already block code edits, so anything outside
//              docs/reviews/** and docs/fences/** can only be a tool byproduct (e.g. `next build`
//              rewriting next-env.d.ts while the reviewer re-ran the checks). Those paths are
//              reverted and listed in .devos/surface-warnings.txt; pass --strict to FAIL instead.
//
// Usage: node scripts/devos/guard-surfaces.mjs builder|reviewer [--strict]
import { rmSync, mkdirSync, appendFileSync } from "node:fs";
import { changedPaths, config, matchesAny, fail, git, P } from "./lib.mjs";

const role = process.argv[2];
const strict = process.argv.includes("--strict");
if (!["builder", "reviewer"].includes(role)) fail("usage: guard-surfaces.mjs builder|reviewer [--strict]", 2);

const cfg = config();
const ignore = cfg.surfaces.ignore ?? [];
const changed = changedPaths().filter((p) => !matchesAny(p, ignore));
const offenders =
  role === "builder"
    ? changed.filter((p) => matchesAny(p, cfg.surfaces.builder.deny))
    : changed.filter((p) => !matchesAny(p, cfg.surfaces.reviewer.allow));

console.log(`guard:surfaces(${role}): ${changed.length} changed path(s)`);
for (const p of changed) console.log(`  ${offenders.includes(p) ? "✗" : "·"} ${p}`);

if (!offenders.length) {
  console.log(`guard:surfaces(${role}): PASS`);
  process.exit(0);
}

if (role === "builder" || strict) {
  console.log(`guard:surfaces(${role}): FAIL — ${offenders.length} path(s) outside the ${role}'s surface`);
  process.exit(1);
}

mkdirSync(P(".devos"), { recursive: true });
for (const p of offenders) {
  let tracked = true;
  try { git(["ls-files", "--error-unmatch", "--", p]); } catch { tracked = false; }
  if (tracked) git(["checkout", "--", p]);
  else rmSync(P(p), { force: true, recursive: true });
  appendFileSync(P(".devos/surface-warnings.txt"), `reviewer run changed ${p} (reverted)\n`);
}
console.log(`guard:surfaces(reviewer): PASS after reverting ${offenders.length} byproduct path(s); see .devos/surface-warnings.txt`);
