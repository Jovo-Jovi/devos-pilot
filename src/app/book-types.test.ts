import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { BookType } from "@/content/book-types";
import { getMessages } from "@/i18n/messages";

const state = vi.hoisted(() => ({
  bookTypes: [] as BookType[],
  covers: [] as { bookTypeId: string; coverUrl: string }[],
}));

vi.mock("next/server", () => ({
  connection: async () => {},
}));

vi.mock("@/content/readers", () => ({
  readLibraryBookTypes: async () => state.bookTypes,
  readBookTypeCovers: async () => state.covers,
}));

import { BookTypeList } from "./[locale]/book-types/BookTypeList";

const novels: BookType = {
  id: "novels",
  nameAr: "الروايات",
  nameEn: "Novels",
  descriptionAr: "روايات عربية ومترجمة.",
  descriptionEn: "Arabic and translated novels.",
  sortOrder: 10,
};

const history: BookType = {
  id: "history",
  nameAr: "التاريخ",
  nameEn: "History",
  descriptionAr: "تاريخ مصر والعالم.",
  descriptionEn: "The history of Egypt and beyond.",
  sortOrder: 30,
};

describe("book type list", () => {
  it("renders the Arabic pending state when there are no book types", async () => {
    state.bookTypes = [];
    const messages = getMessages("ar");
    const html = renderToStaticMarkup(await BookTypeList({ locale: "ar" }));
    expect(html).toContain(messages.state.pendingBookTypes);
    expect(html).not.toContain('class="book-types"');
  });

  it("renders English names in the given order with cover placeholders", async () => {
    state.bookTypes = [novels, history];
    const html = renderToStaticMarkup(await BookTypeList({ locale: "en" }));
    const novelsAt = html.indexOf("Novels");
    const historyAt = html.indexOf("History");
    expect(novelsAt).toBeGreaterThanOrEqual(0);
    expect(historyAt).toBeGreaterThan(novelsAt);
    expect(html.match(/class="book-type"/g)).toHaveLength(2);
    expect(html.match(/class="cover"/g)).toHaveLength(2);
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(2);
  });

  it("renders one decorative cover image before the history name", async () => {
    state.bookTypes = [novels, history];
    state.covers = [
      {
        bookTypeId: "novels",
        coverUrl:
          "http://127.0.0.1:8333/devos-test/book-types/novels/01234567-89ab-4def-8123-456789abcdef.webp",
      },
    ];
    const html = renderToStaticMarkup(await BookTypeList({ locale: "ar" }));
    const imageTag = "<" + "img";
    const images = html.match(new RegExp(imageTag + "\\b[^>]*>", "g")) ?? [];
    expect(images).toHaveLength(1);
    expect(images[0]).toContain(
      'src="http://127.0.0.1:8333/devos-test/book-types/novels/01234567-89ab-4def-8123-456789abcdef.webp"',
    );
    expect(images[0]).toContain('alt=""');
    expect(images[0]).toContain('loading="lazy"');
    expect(images[0]).toContain('decoding="async"');
    const imageAt = html.indexOf(imageTag);
    const historyAt = html.indexOf(history.nameAr);
    expect(imageAt).toBeGreaterThanOrEqual(0);
    expect(historyAt).toBeGreaterThan(imageAt);
    expect(html.match(/class="cover"/g)).toHaveLength(2);
  });
});
