import { describe, expect, it } from "vitest";
import slotsJson from "../../content/opening-slots.json";
import { parseOpeningSlots } from "./schema";
import { cairoClock, openStatus, todaySlots } from "./status";

const signed = parseOpeningSlots(slotsJson);

describe("status", () => {
  it("reads Africa/Cairo from the instant, including the winter and summer offsets", () => {
    expect(cairoClock(new Date("2026-01-09T22:30:00Z"))).toEqual({
      dayOfWeek: 6,
      time: "00:30",
    });
    expect(cairoClock(new Date("2026-01-10T08:00:00Z"))).toEqual({
      dayOfWeek: 6,
      time: "10:00",
    });
    expect(cairoClock(new Date("2026-07-10T08:00:00Z"))).toEqual({
      dayOfWeek: 5,
      time: "11:00",
    });
  });

  it("treats the opening instant as open", () => {
    expect(openStatus(signed, new Date("2026-01-10T07:00:00Z"))).toEqual({
      state: "open",
      until: "14:00",
    });
    expect(openStatus(signed, new Date("2026-01-10T08:00:00Z"))).toEqual({
      state: "open",
      until: "14:00",
    });
    expect(openStatus(signed, new Date("2026-01-08T08:00:00Z"))).toEqual({
      state: "open",
      until: "15:00",
    });
  });

  it("treats the closing instant as closed and names the next opening the same day", () => {
    expect(openStatus(signed, new Date("2026-01-10T12:00:00Z"))).toEqual({
      state: "closed",
      opensDayOfWeek: 6,
      opensAt: "17:00",
    });
    expect(openStatus(signed, new Date("2026-01-10T13:00:00Z"))).toEqual({
      state: "closed",
      opensDayOfWeek: 6,
      opensAt: "17:00",
    });
  });

  it("names today's first opening when Cairo is still before it, including after midnight", () => {
    expect(openStatus(signed, new Date("2026-01-10T05:00:00Z"))).toEqual({
      state: "closed",
      opensDayOfWeek: 6,
      opensAt: "09:00",
    });
    expect(openStatus(signed, new Date("2026-01-09T22:30:00Z"))).toEqual({
      state: "closed",
      opensDayOfWeek: 6,
      opensAt: "09:00",
    });
  });

  it("wraps to Sunday after Saturday has closed", () => {
    expect(openStatus(signed, new Date("2026-01-10T20:00:00Z"))).toEqual({
      state: "closed",
      opensDayOfWeek: 0,
      opensAt: "09:00",
    });
  });

  it("skips a day with no opening, including a closed Friday", () => {
    expect(openStatus(signed, new Date("2026-01-09T10:00:00Z"))).toEqual({
      state: "closed",
      opensDayOfWeek: 6,
      opensAt: "09:00",
    });
    expect(openStatus(signed, new Date("2026-01-08T14:00:00Z"))).toEqual({
      state: "closed",
      opensDayOfWeek: 6,
      opensAt: "09:00",
    });
  });

  it("returns none for no openings and sorts one day without mutating the input", () => {
    expect(openStatus([], new Date("2026-01-10T08:00:00Z"))).toEqual({ state: "none" });
    expect(todaySlots(signed, 6).map((s) => s.id)).toEqual(["sat-morning", "sat-evening"]);
    const reversed = [...signed].reverse();
    const reversedIds = reversed.map((s) => s.id);
    expect(todaySlots(reversed, 6).map((s) => s.id)).toEqual(["sat-morning", "sat-evening"]);
    expect(reversed.map((s) => s.id)).toEqual(reversedIds);
    expect(todaySlots(signed, 5)).toHaveLength(0);
    const ids = signed.map((s) => s.id);
    todaySlots(signed, 6);
    expect(signed.map((s) => s.id)).toEqual(ids);
  });
});
