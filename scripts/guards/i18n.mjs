// guard:i18n — both catalogues exist with identical keys and no empty values; no hardcoded lang (I18N_MODEL §3).
import { read, exists, hasSrc, srcFiles, scan, result } from "./lib.mjs";

const CATALOGUES = { ar: "src/i18n/messages/ar.json", en: "src/i18n/messages/en.json" };

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

export default function i18n() {
  if (!hasSrc()) return result("N/A", [], "src/ does not exist yet");
  const findings = [];
  const flat = {};
  for (const [loc, file] of Object.entries(CATALOGUES)) {
    if (!exists(file)) { findings.push(`${file} — missing catalogue`); continue; }
    try { flat[loc] = flatten(JSON.parse(read(file))); } catch (e) { findings.push(`${file} — invalid JSON: ${e.message}`); }
  }
  if (flat.ar && flat.en) {
    for (const k of Object.keys(flat.en)) if (!(k in flat.ar)) findings.push(`ar.json missing key ${k}`);
    for (const k of Object.keys(flat.ar)) if (!(k in flat.en)) findings.push(`en.json missing key ${k}`);
    for (const [loc, m] of Object.entries(flat)) for (const [k, v] of Object.entries(m)) {
      if (typeof v !== "string" || !v.trim()) findings.push(`${loc}.json ${k} — empty or non-string value`);
    }
  }
  findings.push(...scan(srcFiles([".tsx"]), [{ re: /\blang=["'](ar|en)["']/, label: "hardcoded lang attribute (derive it from the URL locale)" }]));
  const keys = flat.en ? Object.keys(flat.en).length : 0;
  return result(findings.length ? "FAIL" : "PASS", findings, `${keys} keys per locale`);
}
