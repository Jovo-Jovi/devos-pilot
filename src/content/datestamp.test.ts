import { describe, expect, it } from "vitest";
import type { Locale } from "../i18n/config";
import { dateStampParts } from "./datestamp";

function expectedMonth(locale: Locale, year: number, month: number): string {
  return new Intl.DateTimeFormat(locale, {
    month: locale === "ar" ? "long" : "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

describe("datestamp", () => {
  it("returns the day and the localised month for October and September", () => {
    expect(dateStampParts("2026-10-04", "en")).toEqual({
      day: 4,
      month: expectedMonth("en", 2026, 10),
    });
    expect(dateStampParts("2026-09-21", "en").day).toBe(21);
  });

  it("returns an Arabic month that differs from English and has no Latin letters", () => {
    const arabic = dateStampParts("2026-10-04", "ar");
    expect(arabic).toEqual({
      day: 4,
      month: expectedMonth("ar", 2026, 10),
    });
    expect(arabic.month).not.toBe(dateStampParts("2026-10-04", "en").month);
    expect(arabic.month).not.toMatch(/[A-Za-z]/);
  });

  it("accepts the year edges and rejects a bad pattern and an impossible day", () => {
    expect(dateStampParts("2026-12-31", "en")).toEqual({
      day: 31,
      month: expectedMonth("en", 2026, 12),
    });
    expect(dateStampParts("2026-01-01", "en")).toEqual({
      day: 1,
      month: expectedMonth("en", 2026, 1),
    });
    expect(() => dateStampParts("04/10/2026", "en")).toThrow();
    expect(() => dateStampParts("2026-02-30", "en")).toThrow();
  });
});
