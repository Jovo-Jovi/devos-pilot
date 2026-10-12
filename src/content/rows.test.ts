import { describe, expect, it } from "vitest";
import noticesJson from "../../content/library-notices.json";
import slotsJson from "../../content/opening-slots.json";
import {
  libraryNoticesFromRows,
  openingSlotsFromRows,
  type LibraryNoticeRow,
  type OpeningSlotRow,
} from "./rows";
import { parseLibraryNotices, parseOpeningSlots } from "./schema";

// The signed JSON in the DATA_MODEL §2 column shape: what the T12 migration put in the tables.
const noticeRows: LibraryNoticeRow[] = noticesJson.map((notice) => ({
  id: notice.id,
  status: notice.status,
  published_on: notice.publishedOn,
  title_ar: notice.titleAr,
  title_en: notice.titleEn,
  body_ar: notice.bodyAr,
  body_en: notice.bodyEn,
}));
const slotRows: OpeningSlotRow[] = slotsJson.map((slot) => ({
  id: slot.id,
  day_of_week: slot.dayOfWeek,
  opens_at: slot.opensAt,
  closes_at: slot.closesAt,
  note_ar: slot.noteAr ?? null,
  note_en: slot.noteEn ?? null,
}));

describe("database rows to content types", () => {
  it("maps the notice rows to the values the JSON file parses to", () => {
    expect(libraryNoticesFromRows(noticeRows)).toEqual(
      parseLibraryNotices(noticesJson),
    );
  });

  it("maps the slot rows, and a null note pair to no note fields", () => {
    const slots = openingSlotsFromRows(slotRows);
    expect(slots).toEqual(parseOpeningSlots(slotsJson));
    expect(Object.hasOwn(slots[0], "noteAr")).toBe(false);
    expect(Object.hasOwn(slots[0], "noteEn")).toBe(false);
  });

  it("rejects a status other than published or draft, naming the table", () => {
    expect(() =>
      libraryNoticesFromRows([{ ...noticeRows[0], status: "archived" }]),
    ).toThrow(/^public\.library_notices: \[0\]\.status/);
  });

  it("rejects half a note pair, naming the table", () => {
    expect(() =>
      openingSlotsFromRows([{ ...slotRows[0], note_ar: "only-ar" }]),
    ).toThrow(/^public\.opening_slots: \[0\] exactly one of noteAr\/noteEn/);
  });
});
