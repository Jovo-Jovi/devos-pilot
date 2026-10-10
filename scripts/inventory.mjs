import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");

function readText(relPath) {
  return readFileSync(path.join(root, relPath), "utf8");
}

function readJson(relPath) {
  return JSON.parse(readText(relPath));
}

function walkFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walkFiles(full));
    else found.push(full);
  }
  return found;
}

function leafKeys(record) {
  return Object.entries(record).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? leafKeys(value).map((suffix) => `${key}.${suffix}`)
      : [key],
  );
}

function sameList(left, right) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function entityCount(value) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) return 1;
  return value.length;
}

function matchCount(files, pattern) {
  let total = 0;
  for (const file of files) {
    const hits = readFileSync(file, "utf8").match(pattern);
    total += hits ? hits.length : 0;
  }
  return total;
}

const appDir = path.join(root, "src", "app");
const routes = walkFiles(appDir)
  .filter((file) => path.basename(file) === "page.tsx")
  .map((file) => {
    const relDir = path.relative(appDir, path.dirname(file));
    const segments = relDir.split(path.sep).join("/");
    return segments.length === 0 ? "/" : `/${segments}`;
  })
  .sort();

const redirectPattern = /source:\s*"([^"]+)",\s*destination:\s*"([^"]+)"/g;
const configText = readText("next.config.ts");
const redirects = [];
for (let match = redirectPattern.exec(configText); match; match = redirectPattern.exec(configText)) {
  redirects.push([match[1], match[2]]);
}

const componentNames = readdirSync(path.join(root, "src", "components"))
  .filter((name) => name.endsWith(".tsx") && !name.endsWith(".test.tsx"))
  .map((name) => name.slice(0, -".tsx".length))
  .sort();

const arKeys = leafKeys(readJson("src/i18n/messages/ar.json")).sort();
const enKeys = leafKeys(readJson("src/i18n/messages/en.json")).sort();
const identical = sameList(arKeys, enKeys) ? "yes" : "no";

const libraryProfileRecord = readJson("content/library-profile.json");
const openingSlotRows = readJson("content/opening-slots.json");
const libraryNoticeRows = readJson("content/library-notices.json");
const publishedCount = libraryNoticeRows.filter((row) => row.status === "published").length;
const draftCount = libraryNoticeRows.filter((row) => row.status === "draft").length;

const guardBlock = /const GUARDS = \{([^}]*)\}/.exec(readText("scripts/guards/run-all.mjs"));
if (!guardBlock) {
  console.error("inventory: GUARDS declaration not found");
  process.exit(1);
}
const guardNames = guardBlock[1]
  .split(",")
  .map((name) => name.trim())
  .filter((name) => name.length > 0);

const unitFiles = walkFiles(path.join(root, "src")).filter((file) => file.endsWith(".test.ts"));
const e2eFiles = readdirSync(path.join(root, "e2e"))
  .filter((name) => name.endsWith(".spec.ts"))
  .map((name) => path.join(root, "e2e", name));
const unitCount = matchCount(unitFiles, /^\s*it\(/gm);
const e2eCount = matchCount(e2eFiles, /^\s*test\(/gm);

const lines = [
  "inventory: PILOT",
  `routes: ${routes.length}`,
  ...routes.map((route) => `  ${route}`),
  `redirects: ${redirects.length}`,
  ...redirects.map(([source, destination]) => `  ${source} -> ${destination}`),
  `components: ${componentNames.length}`,
  ...componentNames.map((name) => `  ${name}`),
  `catalogue keys: ar ${arKeys.length}, en ${enKeys.length}, identical ${identical}`,
  `content: LibraryProfile ${entityCount(libraryProfileRecord)}, OpeningSlot ${openingSlotRows.length}, LibraryNotice ${libraryNoticeRows.length} (published ${publishedCount}, draft ${draftCount})`,
  `guards: ${guardNames.length}`,
  ...guardNames.map((name) => `  ${name}`),
  `tests: unit ${unitCount}, e2e ${e2eCount}`,
];

process.stdout.write(`${lines.join("\n")}\n`);
