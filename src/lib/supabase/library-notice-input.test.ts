import { describe, expect, it } from "vitest";
import {
  isLibraryNoticeId,
  parseLibraryNoticeInput,
  parseNoticeDone,
} from "./library-notice-input";

const valid = {
  publishedOn: "2026-10-21",
  titleAr: "عنوان",
  titleEn: "Title",
  bodyAr: "متن",
  bodyEn: "Body",
};

function formWith(values: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

describe("parseLibraryNoticeInput", () => {
  it("returns trimmed values for a valid form", () => {
    expect(
      parseLibraryNoticeInput(
        formWith({
          publishedOn: "2026-10-21",
          titleAr: "  عنوان  ",
          titleEn: "  Title  ",
          bodyAr: "  متن  ",
          bodyEn: "  Body  ",
        }),
      ),
    ).toEqual({ ok: true, value: valid });
  });

  it("accepts a real leap day", () => {
    expect(
      parseLibraryNoticeInput(formWith({ ...valid, publishedOn: "2024-02-29" })),
    ).toEqual({
      ok: true,
      value: { ...valid, publishedOn: "2024-02-29" },
    });
  });

  it("rejects each blank or whitespace text field as required", () => {
    for (const name of ["titleAr", "titleEn", "bodyAr", "bodyEn"] as const) {
      for (const blank of ["", "   ", "\t\n"]) {
        expect(parseLibraryNoticeInput(formWith({ ...valid, [name]: blank }))).toEqual({
          ok: false,
          fields: { [name]: "required" },
        });
      }
    }
  });

  it("rejects a missing field as required", () => {
    expect(parseLibraryNoticeInput(new FormData())).toEqual({
      ok: false,
      fields: {
        publishedOn: "required",
        titleAr: "required",
        titleEn: "required",
        bodyAr: "required",
        bodyEn: "required",
      },
    });
    const withoutTitle = formWith(valid);
    withoutTitle.delete("titleEn");
    expect(parseLibraryNoticeInput(withoutTitle)).toEqual({
      ok: false,
      fields: { titleEn: "required" },
    });
  });

  it("rejects an empty or impossible publishedOn as a date", () => {
    for (const publishedOn of ["", "2026-13-01", "2026-02-30", "12/01/2026"]) {
      expect(
        parseLibraryNoticeInput(formWith({ ...valid, publishedOn })),
      ).toEqual({
        ok: false,
        fields: { publishedOn: "date" },
      });
    }
  });
});

describe("isLibraryNoticeId", () => {
  it("accepts a uuid and a kebab id, and rejects a spaced name and an empty string", () => {
    expect(isLibraryNoticeId("a14a14a1-14a1-44a1-84a1-14a114a114a1")).toBe(true);
    expect(isLibraryNoticeId("reading-club-october")).toBe(true);
    expect(isLibraryNoticeId("New Id")).toBe(false);
    expect(isLibraryNoticeId("")).toBe(false);
  });
});

describe("parseNoticeDone", () => {
  it("returns the three outcomes and null for anything else", () => {
    expect(parseNoticeDone("saved")).toBe("saved");
    expect(parseNoticeDone("published")).toBe("published");
    expect(parseNoticeDone("unpublished")).toBe("unpublished");
    expect(parseNoticeDone("x")).toBeNull();
    expect(parseNoticeDone(undefined)).toBeNull();
  });
});
