import { describe, expect, it } from "vitest";
import {
  isOpeningSlotId,
  parseDayOfWeek,
  parseHoursDone,
  parseOpeningSlotInput,
} from "./opening-slot-input";

const valid = {
  dayOfWeek: "6",
  opensAt: "09:00",
  closesAt: "14:00",
  noteAr: "",
  noteEn: "",
};

function formWith(values: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

describe("parseOpeningSlotInput", () => {
  it("returns trimmed notes, and blank notes as null", () => {
    expect(
      parseOpeningSlotInput(
        formWith({
          ...valid,
          noteAr: "  ملاحظة  ",
          noteEn: "  Short day  ",
        }),
      ),
    ).toEqual({
      ok: true,
      value: {
        dayOfWeek: 6,
        opensAt: "09:00",
        closesAt: "14:00",
        noteAr: "ملاحظة",
        noteEn: "Short day",
      },
    });
    expect(parseOpeningSlotInput(formWith(valid))).toEqual({
      ok: true,
      value: {
        dayOfWeek: 6,
        opensAt: "09:00",
        closesAt: "14:00",
        noteAr: null,
        noteEn: null,
      },
    });
    const omitted = formWith({
      dayOfWeek: "6",
      opensAt: "09:00",
      closesAt: "14:00",
    });
    expect(parseOpeningSlotInput(omitted)).toEqual({
      ok: true,
      value: {
        dayOfWeek: 6,
        opensAt: "09:00",
        closesAt: "14:00",
        noteAr: null,
        noteEn: null,
      },
    });
  });

  it("rejects a day outside 0–6, or a missing day, as required", () => {
    for (const dayOfWeek of ["7", "-1", "x"]) {
      expect(parseOpeningSlotInput(formWith({ ...valid, dayOfWeek }))).toEqual({
        ok: false,
        fields: { dayOfWeek: "required" },
      });
    }
    const missing = formWith(valid);
    missing.delete("dayOfWeek");
    expect(parseOpeningSlotInput(missing)).toEqual({
      ok: false,
      fields: { dayOfWeek: "required" },
    });
  });

  it("rejects an empty or missing time as required", () => {
    for (const name of ["opensAt", "closesAt"] as const) {
      expect(parseOpeningSlotInput(formWith({ ...valid, [name]: "" }))).toEqual({
        ok: false,
        fields: { [name]: "required" },
      });
      const missing = formWith(valid);
      missing.delete(name);
      expect(parseOpeningSlotInput(missing)).toEqual({
        ok: false,
        fields: { [name]: "required" },
      });
    }
  });

  it("rejects a time that is not HH:MM", () => {
    for (const name of ["opensAt", "closesAt"] as const) {
      for (const time of ["9:00", "24:00", "12:60", "09:00:00"]) {
        expect(parseOpeningSlotInput(formWith({ ...valid, [name]: time }))).toEqual({
          ok: false,
          fields: { [name]: "time" },
        });
      }
    }
  });

  it("rejects equal and reversed times on closesAt", () => {
    expect(
      parseOpeningSlotInput(formWith({ ...valid, opensAt: "09:00", closesAt: "09:00" })),
    ).toEqual({
      ok: false,
      fields: { closesAt: "order" },
    });
    expect(
      parseOpeningSlotInput(formWith({ ...valid, opensAt: "14:00", closesAt: "09:00" })),
    ).toEqual({
      ok: false,
      fields: { closesAt: "order" },
    });
  });

  it("rejects exactly one note on the blank one", () => {
    expect(
      parseOpeningSlotInput(formWith({ ...valid, noteAr: "ملاحظة", noteEn: "" })),
    ).toEqual({
      ok: false,
      fields: { noteEn: "pair" },
    });
    expect(
      parseOpeningSlotInput(formWith({ ...valid, noteAr: "", noteEn: "Note" })),
    ).toEqual({
      ok: false,
      fields: { noteAr: "pair" },
    });
  });
});

describe("isOpeningSlotId", () => {
  it("accepts a kebab id and a uuid, and rejects a spaced name and an empty string", () => {
    expect(isOpeningSlotId("sat-morning")).toBe(true);
    expect(isOpeningSlotId("a14a14a1-14a1-44a1-84a1-14a114a114a1")).toBe(true);
    expect(isOpeningSlotId("Sat Morning")).toBe(false);
    expect(isOpeningSlotId("")).toBe(false);
  });
});

describe("parseHoursDone", () => {
  it("returns the three outcomes and null for anything else", () => {
    expect(parseHoursDone("added")).toBe("added");
    expect(parseHoursDone("changed")).toBe("changed");
    expect(parseHoursDone("removed")).toBe("removed");
    expect(parseHoursDone("x")).toBeNull();
    expect(parseHoursDone(undefined)).toBeNull();
  });
});

describe("parseDayOfWeek", () => {
  it("returns 0–6 from a digit string and null otherwise", () => {
    expect(parseDayOfWeek("0")).toBe(0);
    expect(parseDayOfWeek("6")).toBe(6);
    expect(parseDayOfWeek("7")).toBeNull();
    expect(parseDayOfWeek("")).toBeNull();
    expect(parseDayOfWeek(undefined)).toBeNull();
  });
});
