// Recognise "out of plan usage / rate limited / provider overloaded" in agent output (PR-12).
// These are waits, not failures: the task is parked with devos:quota-wait and devos-resume
// re-dispatches it hourly. Keep the patterns broad; a false positive only delays a retry by an hour.
import { readFileSync, existsSync } from "node:fs";
import { P } from "./lib.mjs";

const LIMIT_RE = new RegExp(
  [
    "usage limit", "limit reached", "hit your (usage )?limit", "rate[ _-]?limit", "too many requests", "\\b429\\b",
    "quota", "out of (credits|requests|usage)", "insufficient (credits|balance|quota)", "credit balance",
    "billing", "plan limit", "resets? (at|in)", "try again (later|in)", "overloaded", "\\b529\\b", "capacity",
  ].join("|"),
  "i",
);

export const readText = (rel) => (existsSync(P(rel)) ? readFileSync(P(rel), "utf8") : "");

export function looksLikeLimit(...texts) {
  return LIMIT_RE.test(texts.filter(Boolean).join("\n"));
}

/** Marker the devos-resume workflow reads from the PR comments. */
export function resumeMarker(task, attempt, reviewOnly) {
  return `<!-- devos-resume task=${task} attempt=${attempt} review_only=${reviewOnly ? "true" : "false"} -->`;
}

export function parseJsonLoose(text) {
  try { return JSON.parse(text); } catch { /* fall through */ }
  const last = text.trim().split(/\r?\n/).reverse().find((l) => l.trim().startsWith("{"));
  try { return last ? JSON.parse(last) : null; } catch { return null; }
}
