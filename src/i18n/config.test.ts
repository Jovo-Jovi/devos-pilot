import { describe, expect, it } from "vitest";
import { directionOf, isLocale } from "./config";

describe("locale config", () => {
  it("maps Arabic to rtl", () => {
    expect(directionOf("ar")).toBe("rtl");
  });

  it("maps English to ltr", () => {
    expect(directionOf("en")).toBe("ltr");
  });

  it("rejects an unknown locale", () => {
    expect(isLocale("fr")).toBe(false);
  });
});
