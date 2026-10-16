import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { BookType } from "@/content/book-types";
import { getMessages } from "@/i18n/messages";

const state = vi.hoisted(() => ({
  bookTypes: [] as BookType[],
}));

vi.mock("next/server", () => ({
  connection: async () => {},
}));

vi.mock("@/content/readers", () => ({
  readLibraryBookTypes: async () => state.bookTypes,
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
});
