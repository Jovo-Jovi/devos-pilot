// Shared helpers for the Dev OS runner. Dependency-free on purpose: it must run before T01
// creates package.json, on Linux CI and on a developer machine.
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const P = (...p) => join(ROOT, ...p);

export function readJson(rel) {
  return JSON.parse(readFileSync(P(rel), "utf8"));
}

export function config() {
  return readJson("devos.config.json");
}

// ---------- PHASES.md ----------------------------------------------------------------------

const HEADER = ["Task", "Phase", "Station", "Name", "Risk", "Gate", "Done", "Verdict"];

function splitRow(line) {
  // "| a | b |" -> ["a", "b"]
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

export function parsePhases(text = readFileSync(P("docs/PHASES.md"), "utf8")) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => {
    const cells = l.trim().startsWith("|") ? splitRow(l) : [];
    return cells.length === HEADER.length && cells.every((c, i) => c === HEADER[i]);
  });
  if (start < 0) throw new Error("PHASES.md: task table header not found: | " + HEADER.join(" | ") + " |");
  const rows = [];
  for (let i = start + 2; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim().startsWith("|")) break;
    const c = splitRow(l);
    if (c.length !== HEADER.length) throw new Error(`PHASES.md line ${i + 1}: expected ${HEADER.length} cells, got ${c.length}`);
    rows.push({
      line: i,
      task: c[0], phase: c[1], station: c[2], name: c[3],
      risk: Number(c[4]), gate: c[5], done: c[6] === "[x]", doneRaw: c[6], verdict: c[7],
    });
  }
  return { lines, rows, start };
}

export function isHumanGate(row) {
  return row.risk >= 3 || (row.gate && row.gate !== "—" && row.gate !== "-");
}

export function reviewerModel(row, cfg = config()) {
  if (row.gate && row.gate !== "—" && row.gate !== "-") return cfg.reviewer.gate_model;
  return cfg.reviewer.model_by_risk[String(row.risk)] ?? cfg.reviewer.gate_model;
}

export function nextOpenTask(rows) {
  return rows.find((r) => !r.done) ?? null;
}

export function taskAfter(rows, task) {
  const i = rows.findIndex((r) => r.task === task);
  return i >= 0 && i + 1 < rows.length ? rows[i + 1] : null;
}

export function updatePhasesRow(task, { done, verdict }) {
  const file = P("docs/PHASES.md");
  const text = readFileSync(file, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const { lines, rows } = parsePhases(text);
  const row = rows.find((r) => r.task === task);
  if (!row) throw new Error(`PHASES.md: no row for ${task}`);
  const c = splitRow(lines[row.line]);
  if (done !== undefined) c[6] = done ? "[x]" : "[ ]";
  if (verdict !== undefined) c[7] = verdict;
  lines[row.line] = "| " + c.join(" | ") + " |";
  writeFileSync(file, lines.join(eol));
}

// ---------- git ----------------------------------------------------------------------------

export function git(args, opts = {}) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trim();
}

/** Paths changed in the working tree relative to HEAD, including untracked, excluding ignored. */
export function changedPaths() {
  const out = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], { cwd: ROOT, encoding: "utf8" });
  const paths = [];
  const parts = out.split("\0").filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i];
    const status = entry.slice(0, 2);
    paths.push(entry.slice(3));
    if (status[0] === "R" || status[0] === "C") paths.push(parts[++i]); // rename source
  }
  return [...new Set(paths)];
}

// ---------- globs --------------------------------------------------------------------------

export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        i++;
        if (glob[i + 1] === "/") { i++; re += "(?:.*/)?"; } else re += ".*";
      } else re += "[^/]*";
    } else if (ch === "?") re += "[^/]";
    else re += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp("^" + re + "$");
}

export const matchesAny = (path, globs) => globs.some((g) => globToRegExp(g).test(path));

// ---------- outputs ------------------------------------------------------------------------

/** Emit key=value for GitHub Actions ($GITHUB_OUTPUT) and also print it for local runs. */
export function emit(obj) {
  const lines = Object.entries(obj).map(([k, v]) => `${k}=${String(v ?? "").replace(/\r?\n/g, " ")}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, lines.join("\n") + "\n");
  console.log(lines.join("\n"));
}

export function fail(msg, code = 1) {
  console.error(`DEVOS: ${msg}`);
  process.exit(code);
}

export { existsSync, readFileSync, writeFileSync };
