import { describe, expect, it } from "vitest";
import noticesJson from "../../content/library-notices.json";
import { selectLatestNotices, selectPublishedNotices } from "./notices";
import { parseLibraryNotices, type LibraryNotice } from "./schema";

function libraryNotice(
  overrides: Partial<LibraryNotice> & Pick<LibraryNotice, "id" | "status">,
): LibraryNotice {
  return {
    publishedOn: "2026-01-01",
    titleAr: "ar-title",
    titleEn: "en-title",
    bodyAr: "ar-body",
    bodyEn: "en-body",
    ...overrides,
  };
}

describe("published library notices", () => {
  it("selects the signed published ids newest first", () => {
    const notices = parseLibraryNotices(noticesJson);
    expect(selectPublishedNotices(notices).map((notice) => notice.id)).toEqual([
      "reading-club-october",
      "national-holiday-closure",
      "new-arabic-arrivals",
    ]);
  });

  it("never returns a draft, even when it has the newest date", () => {
    const notices = [
      libraryNotice({
        id: "future-draft",
        status: "draft",
        publishedOn: "2026-12-01",
      }),
      libraryNotice({
        id: "older-published",
        status: "published",
        publishedOn: "2026-01-01",
      }),
    ];
    expect(selectPublishedNotices(notices).map((notice) => notice.id)).toEqual([
      "older-published",
    ]);
  });

  it("orders two notices with the same publishedOn by id", () => {
    const notices = [
      libraryNotice({
        id: "zeta-title",
        status: "published",
        publishedOn: "2026-05-01",
      }),
      libraryNotice({
        id: "alpha-title",
        status: "published",
        publishedOn: "2026-05-01",
      }),
    ];
    expect(selectPublishedNotices(notices).map((notice) => notice.id)).toEqual([
      "alpha-title",
      "zeta-title",
    ]);
  });

  it("returns the first two published notices and an empty array for limit 0", () => {
    const notices = parseLibraryNotices(noticesJson);
    expect(selectLatestNotices(notices, 2).map((notice) => notice.id)).toEqual([
      "reading-club-october",
      "national-holiday-closure",
    ]);
    expect(selectLatestNotices(notices, 0)).toEqual([]);
  });

  it("does not mutate its input", () => {
    const input = parseLibraryNotices(noticesJson);
    const ids = input.map((notice) => notice.id);
    const first = input[0];
    selectPublishedNotices(input);
    selectLatestNotices(input, 2);
    expect(input.map((notice) => notice.id)).toEqual(ids);
    expect(input[0]).toBe(first);
  });

  it("returns an empty array when no notice is published", () => {
    const notices = [
      libraryNotice({
        id: "only-draft",
        status: "draft",
        publishedOn: "2026-10-20",
      }),
    ];
    expect(selectPublishedNotices(notices)).toEqual([]);
  });
});
