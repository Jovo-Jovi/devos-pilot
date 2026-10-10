export type TemplatePart = { kind: "text"; text: string } | { kind: "token"; name: string };

export function templateParts(template: string): TemplatePart[] {
  const parts: TemplatePart[] = [];
  const token = /\{([a-z]+)\}/g;
  let cursor = 0;
  for (const match of template.matchAll(token)) {
    const index = match.index;
    if (index > cursor) {
      parts.push({ kind: "text", text: template.slice(cursor, index) });
    }
    const name = match[1];
    if (name !== undefined) {
      parts.push({ kind: "token", name });
    }
    cursor = index + match[0].length;
  }
  if (cursor < template.length) {
    parts.push({ kind: "text", text: template.slice(cursor) });
  }
  return parts;
}
