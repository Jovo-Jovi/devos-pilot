import { describe, expect, it } from "vitest";
import slotsJson from "../../content/opening-slots.json";
import { orderOpeningSlots } from "./order";
import { parseOpeningSlots, type OpeningSlot } from "./schema";

describe("opening slot order", () => {
  it("orders the signed slots by dayOfWeek then opensAt", () => {
    const slots = parseOpeningSlots(slotsJson);
    expect(orderOpeningSlots(slots).map((slot) => slot.id)).toEqual([
      "sun",
      "mon",
      "tue",
      "wed",
      "thu",
      "sat-morning",
      "sat-evening",
    ]);
  });

  it("orders a same-day pair by opensAt", () => {
    const later: OpeningSlot = {
      id: "sat-evening",
      dayOfWeek: 6,
      opensAt: "17:00",
      closesAt: "21:00",
    };
    const earlier: OpeningSlot = {
      id: "sat-morning",
      dayOfWeek: 6,
      opensAt: "09:00",
      closesAt: "14:00",
    };
    expect(orderOpeningSlots([later, earlier]).map((slot) => slot.id)).toEqual([
      "sat-morning",
      "sat-evening",
    ]);
  });

  it("does not mutate its input", () => {
    const input = parseOpeningSlots(slotsJson);
    const ids = input.map((slot) => slot.id);
    const first = input[0];
    orderOpeningSlots(input);
    expect(input.map((slot) => slot.id)).toEqual(ids);
    expect(input[0]).toBe(first);
  });
});
