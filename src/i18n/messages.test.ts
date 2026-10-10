import { describe, expect, it } from "vitest";
import ar from "./messages/ar.json";
import en from "./messages/en.json";

function flatten(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    return flatten(child, next);
  });
}

describe("catalogues", () => {
  it("has identical flattened key lists", () => {
    expect(flatten(ar).sort()).toEqual(flatten(en).sort());
  });
});
