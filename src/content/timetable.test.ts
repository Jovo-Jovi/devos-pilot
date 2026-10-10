import { describe, expect, it } from "vitest";
import slotsJson from "../../content/opening-slots.json";
import { parseOpeningSlots } from "./schema";
import { barPlacement, placeOnAxis, timetableDays } from "./timetable";

describe("timetable", () => {
  it("places a morning period on the axis", () => {
    expect(barPlacement("09:00", "14:00")).toEqual({
      start: 7.1429,
      size: 35.7143,
    });
  });

  it("places an evening period and a long day", () => {
    expect(barPlacement("17:00", "21:00")).toEqual({
      start: 64.2857,
      size: 28.5714,
    });
    expect(barPlacement("09:00", "21:00")).toEqual({
      start: 7.1429,
      size: 85.7143,
    });
  });

  it("fills the axis and clamps times outside 08:00–22:00", () => {
    expect(barPlacement("08:00", "22:00")).toEqual({ start: 0, size: 100 });
    expect(barPlacement("07:00", "23:00")).toEqual({ start: 0, size: 100 });
  });

  it("places tick hours", () => {
    expect(placeOnAxis("10:00")).toBe(14.2857);
    expect(placeOnAxis("22:00")).toBe(100);
  });

  it("groups the signed slots Saturday to Friday, including a reversed input", () => {
    const slots = parseOpeningSlots(slotsJson);
    const days = timetableDays(slots);
    expect(days.map((day) => day.dayOfWeek)).toEqual([6, 0, 1, 2, 3, 4, 5]);
    expect(days[0]?.slots.map((slot) => slot.id)).toEqual([
      "sat-morning",
      "sat-evening",
    ]);
    const reversed = [...slots].reverse();
    expect(
      timetableDays(reversed)
        .find((day) => day.dayOfWeek === 6)
        ?.slots.map((slot) => slot.id),
    ).toEqual(["sat-morning", "sat-evening"]);
    expect(days.find((day) => day.dayOfWeek === 5)?.slots).toHaveLength(0);
  });

  it("returns seven empty days for no slots and does not mutate its input", () => {
    const empty = timetableDays([]);
    expect(empty).toHaveLength(7);
    for (const day of empty) {
      expect(day.slots).toHaveLength(0);
    }
    const slots = parseOpeningSlots(slotsJson);
    const ids = slots.map((slot) => slot.id);
    timetableDays(slots);
    expect(slots.map((slot) => slot.id)).toEqual(ids);
  });
});
