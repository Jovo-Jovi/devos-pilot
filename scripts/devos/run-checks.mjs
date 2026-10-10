#!/usr/bin/env node
// Run the project's checks deterministically and record evidence for the reviewer (PR-08).
// Writes .devos/ci-results.json and .devos/logs/<check>.log.
// Usage: node scripts/devos/run-checks.mjs [--strict]
//   --strict  exit 1 if a required check fails (used by ci.yml). Without it, always exit 0.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { P, config, changedPaths, git } from "./lib.mjs";

const strict = process.argv.includes("--strict");
const cfg = config();
mkdirSync(P(".devos/logs"), { recursive: true });

const hasPkg = existsSync(P("package.json"));
const scripts = hasPkg ? JSON.parse(readFileSync(P("package.json"), "utf8")).scripts ?? {} : {};
const before = new Set(changedPaths());

function run(name, cmd, args) {
  const t0 = Date.now();
  const r = spawnSync(cmd, args, {
    cwd: P(), encoding: "utf8", shell: process.platform === "win32",
    env: { ...process.env, CI: "true", FORCE_COLOR: "0" }, maxBuffer: 64 * 1024 * 1024,
  });
  const log = `$ ${cmd} ${args.join(" ")}\n${r.stdout ?? ""}${r.stderr ?? ""}${r.error ? "\n" + r.error.message : ""}`;
  writeFileSync(P(`.devos/logs/${name}.log`), log);
  const tail = log.split(/\r?\n/).slice(-60).join("\n");
  return { name, command: `${cmd} ${args.join(" ")}`, status: r.status === 0 ? "pass" : "fail", exit: r.status, seconds: Math.round((Date.now() - t0) / 1000), tail };
}

const results = [];
for (const name of [...cfg.required_checks, ...cfg.optional_checks]) {
  const required = cfg.required_checks.includes(name);
  if (!hasPkg) {
    if (name === "guards") results.push({ ...run(name, "node", ["scripts/guards/run-all.mjs"]), required });
    else results.push({ name, required, status: "skipped-no-package", tail: "package.json does not exist yet" });
    continue;
  }
  if (!scripts[name]) {
    results.push({ name, required, status: required ? "missing" : "skipped", tail: `package.json has no "${name}" script` });
    continue;
  }
  if (name === "e2e" && scripts.e2e) {
    // Playwright needs its browser; install quietly when the project uses it.
    spawnSync("pnpm", ["exec", "playwright", "install", "--with-deps", "chromium"], { cwd: P(), stdio: "ignore", shell: process.platform === "win32" });
  }
  results.push({ ...run(name, "pnpm", ["run", name]), required });
}

// Checks must not change tracked files. If they did (e.g. next build rewrote next-env.d.ts), record
// it as evidence for the reviewer and restore the tree so later guards see only agent changes.
const dirtied = changedPaths().filter((p) => !before.has(p) && !p.startsWith(".devos/"));
if (dirtied.length) {
  for (const p of dirtied) {
    try { git(["checkout", "--", p]); } catch { /* untracked: leave for git clean */ }
  }
  try { git(["clean", "-fd", "--", ...dirtied]); } catch { /* nothing to clean */ }
}

const failedRequired = results.filter((r) => r.required && !["pass", "skipped-no-package"].includes(r.status));
const summary = {
  generated: new Date().toISOString(),
  head: (() => { try { return git(["rev-parse", "HEAD"]); } catch { return null; } })(),
  has_package_json: hasPkg,
  all_required_passed: failedRequired.length === 0,
  failed_required: failedRequired.map((r) => r.name),
  checks_modified_tracked_files: dirtied,
  results,
};
writeFileSync(P(".devos/ci-results.json"), JSON.stringify(summary, null, 2));

for (const r of results) console.log(`${r.status.toUpperCase().padEnd(18)} ${r.name}${r.required ? "" : " (optional)"}`);
if (dirtied.length) console.log(`WARN checks modified tracked files (restored): ${dirtied.join(", ")}`);
console.log(failedRequired.length ? `required checks failed: ${failedRequired.map((r) => r.name).join(", ")}` : "all required checks passed");
if (strict && failedRequired.length) process.exit(1);
