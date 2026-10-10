import { describe, expect, it } from "vitest";
import noticesJson from "../../content/library-notices.json";
import slotsJson from "../../content/opening-slots.json";
import profileJson from "../../content/library-profile.json";
import {
  parseLibraryNotices,
  parseLibraryProfile,
  parseOpeningSlots,
} from "./schema";

const PROFILE = "content/library-profile.json";
const SLOTS = "content/opening-slots.json";
const NOTICES = "content/library-notices.json";

function profile(
  overrides: Record<string, unknown> = {},
  omit: string[] = [],
): Record<string, unknown> {
  const value: Record<string, unknown> = {
    nameAr: "ar-name",
    nameEn: "en-name",
    addressAr: "ar-address",
    addressEn: "en-address",
    phone: "+12025550123",
    ...overrides,
  };
  for (const key of omit) delete value[key];
  return value;
}

function slot(
  overrides: Record<string, unknown> = {},
  omit: string[] = [],
): Record<string, unknown> {
  const value: Record<string, unknown> = {
    id: "sun",
    dayOfWeek: 0,
    opensAt: "09:00",
    closesAt: "21:00",
    ...overrides,
  };
  for (const key of omit) delete value[key];
  return value;
}

function notice(
  overrides: Record<string, unknown> = {},
  omit: string[] = [],
): Record<string, unknown> {
  const value: Record<string, unknown> = {
    id: "reading-club",
    status: "published",
    publishedOn: "2026-10-04",
    titleAr: "ar-title",
    titleEn: "en-title",
    bodyAr: "ar-body",
    bodyEn: "en-body",
    ...overrides,
  };
  for (const key of omit) delete value[key];
  return value;
}

describe("content schema", () => {
  it("parses the signed profile, opening slots and library notices", () => {
    const parsedProfile = parseLibraryProfile(profileJson);
    const slots = parseOpeningSlots(slotsJson);
    const notices = parseLibraryNotices(noticesJson);
    expect(parsedProfile.phone).toBe(profileJson.phone);
    expect(slots).toHaveLength(7);
    expect(notices).toHaveLength(4);
  });

  it("rejects a wrong top-level shape", () => {
    expect(() => parseLibraryProfile([])).toThrow(new RegExp(`^${PROFILE}`));
    expect(() => parseOpeningSlots({})).toThrow(new RegExp(`^${SLOTS}`));
    expect(() => parseLibraryNotices({})).toThrow(new RegExp(`^${NOTICES}`));
  });

  it("rejects a missing or non-string required field", () => {
    expect(() => parseLibraryProfile(profile({}, ["nameAr"]))).toThrow(
      new RegExp(`^${PROFILE}`),
    );
    expect(() => parseLibraryProfile(profile({ nameEn: 4 }))).toThrow(
      new RegExp(`^${PROFILE}`),
    );
    expect(() => parseOpeningSlots([slot({}, ["id"])])).toThrow(
      new RegExp(`^${SLOTS}`),
    );
    expect(() => parseLibraryNotices([notice({ titleAr: 1 })])).toThrow(
      new RegExp(`^${NOTICES}`),
    );
  });

  it("rejects an empty string in a required field", () => {
    expect(() => parseLibraryProfile(profile({ addressEn: "" }))).toThrow(
      new RegExp(`^${PROFILE}`),
    );
    expect(() => parseOpeningSlots([slot({ opensAt: "" })])).toThrow(
      new RegExp(`^${SLOTS}`),
    );
    expect(() => parseLibraryNotices([notice({ bodyAr: "" })])).toThrow(
      new RegExp(`^${NOTICES}`),
    );
  });

  it("rejects an unknown field", () => {
    expect(() => parseLibraryProfile(profile({ extra: "x" }))).toThrow(
      new RegExp(`^${PROFILE}`),
    );
    expect(() => parseOpeningSlots([slot({ extra: "x" })])).toThrow(
      new RegExp(`^${SLOTS}`),
    );
    expect(() => parseLibraryNotices([notice({ extra: "x" })])).toThrow(
      new RegExp(`^${NOTICES}`),
    );
  });

  it("rejects a phone that is not E.164", () => {
    expect(() => parseLibraryProfile(profile({ phone: "12025550123" }))).toThrow(
      new RegExp(`^${PROFILE}`),
    );
    expect(() => parseLibraryProfile(profile({ phone: "+0123" }))).toThrow(
      new RegExp(`^${PROFILE}`),
    );
  });

  it("rejects an id that is not kebab-case or is duplicated", () => {
    expect(() => parseOpeningSlots([slot({ id: "Sun" })])).toThrow(
      new RegExp(`^${SLOTS}`),
    );
    expect(() => parseOpeningSlots([slot(), slot()])).toThrow(
      new RegExp(`^${SLOTS}`),
    );
    expect(() =>
      parseLibraryNotices([notice(), notice({ publishedOn: "2026-10-05" })]),
    ).toThrow(new RegExp(`^${NOTICES}`));
  });

  it("rejects a dayOfWeek that is not an integer 0-6", () => {
    expect(() => parseOpeningSlots([slot({ dayOfWeek: 7 })])).toThrow(
      new RegExp(`^${SLOTS}`),
    );
    expect(() => parseOpeningSlots([slot({ dayOfWeek: -1 })])).toThrow(
      new RegExp(`^${SLOTS}`),
    );
    expect(() => parseOpeningSlots([slot({ dayOfWeek: 1.5 })])).toThrow(
      new RegExp(`^${SLOTS}`),
    );
    expect(() => parseOpeningSlots([slot({ dayOfWeek: "1" })])).toThrow(
      new RegExp(`^${SLOTS}`),
    );
  });

  it("rejects opensAt or closesAt that is not HH:MM or opensAt >= closesAt", () => {
    expect(() => parseOpeningSlots([slot({ opensAt: "9:00" })])).toThrow(
      new RegExp(`^${SLOTS}`),
    );
    expect(() => parseOpeningSlots([slot({ closesAt: "24:00" })])).toThrow(
      new RegExp(`^${SLOTS}`),
    );
    expect(() =>
      parseOpeningSlots([slot({ opensAt: "09:00", closesAt: "09:00" })]),
    ).toThrow(new RegExp(`^${SLOTS}`));
    expect(() =>
      parseOpeningSlots([slot({ opensAt: "18:00", closesAt: "09:00" })]),
    ).toThrow(new RegExp(`^${SLOTS}`));
  });

  it("rejects exactly one of noteAr or noteEn", () => {
    expect(() => parseOpeningSlots([slot({ noteAr: "only-ar" })])).toThrow(
      new RegExp(`^${SLOTS}`),
    );
    expect(() => parseOpeningSlots([slot({ noteEn: "only-en" })])).toThrow(
      new RegExp(`^${SLOTS}`),
    );
  });

  it("rejects a status other than published or draft", () => {
    expect(() => parseLibraryNotices([notice({ status: "archived" })])).toThrow(
      new RegExp(`^${NOTICES}`),
    );
  });

  it("rejects a publishedOn that is not YYYY-MM-DD", () => {
    expect(() =>
      parseLibraryNotices([notice({ publishedOn: "2026-10-4" })]),
    ).toThrow(new RegExp(`^${NOTICES}`));
    expect(() =>
      parseLibraryNotices([notice({ publishedOn: "2026-13-01" })]),
    ).toThrow(new RegExp(`^${NOTICES}`));
  });
});
