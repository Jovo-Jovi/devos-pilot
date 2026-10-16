import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { bookTypesFromDocuments } from "./book-types";

const seedPath = join(dirname(fileURLToPath(import.meta.url)), "../../firebase/seed/book_types.json");

const validFields = {
  nameAr: "الروايات",
  nameEn: "Novels",
  descriptionAr: "روايات عربية ومترجمة لكل الأعمار.",
  descriptionEn: "Arabic and translated novels for every age.",
  sortOrder: 10,
};

describe("bookTypesFromDocuments", () => {
  it("reads the seed as five book types in sort order", () => {
    const rows = JSON.parse(readFileSync(seedPath, "utf8")) as Array<{ id: string }>;
    const documents = rows.map(({ id, ...fields }) => ({ id, fields }));
    const result = bookTypesFromDocuments(documents);
    expect(result.bookTypes).toHaveLength(5);
    expect(result.skipped).toBe(0);
    expect(result.bookTypes.map((bookType) => bookType.id)).toEqual([
      "novels",
      "childrens-books",
      "history",
      "science",
      "poetry",
    ]);
  });

  it("sorts two valid documents that are out of order, breaking a sortOrder tie by id", () => {
    const result = bookTypesFromDocuments([
      { id: "poetry", fields: { ...validFields, sortOrder: 10 } },
      { id: "novels", fields: { ...validFields, sortOrder: 10 } },
    ]);
    expect(result.skipped).toBe(0);
    expect(result.bookTypes.map((bookType) => bookType.id)).toEqual(["novels", "poetry"]);
  });

  it("skips a document missing descriptionEn and keeps the others", () => {
    const result = bookTypesFromDocuments([
      { id: "novels", fields: validFields },
      {
        id: "history",
        fields: {
          nameAr: "التاريخ",
          nameEn: "History",
          descriptionAr: "تاريخ مصر والعالم العربي والعالم، للقراءة والإعارة.",
          sortOrder: 30,
        },
      },
    ]);
    expect(result.skipped).toBe(1);
    expect(result.bookTypes.map((bookType) => bookType.id)).toEqual(["novels"]);
  });

  it("skips a blank nameAr and a non-integer sortOrder", () => {
    const blankName = bookTypesFromDocuments([
      { id: "novels", fields: { ...validFields, nameAr: "  " } },
    ]);
    const fractionalOrder = bookTypesFromDocuments([
      { id: "history", fields: { ...validFields, sortOrder: 1.5 } },
    ]);
    expect(blankName.skipped).toBe(1);
    expect(blankName.bookTypes).toEqual([]);
    expect(fractionalOrder.skipped).toBe(1);
    expect(fractionalOrder.bookTypes).toEqual([]);
  });

  it("skips an id that is not kebab-case and a document with an extra field", () => {
    const badId = bookTypesFromDocuments([{ id: "Novels", fields: validFields }]);
    const extraField = bookTypesFromDocuments([
      { id: "history", fields: { ...validFields, extra: "nope" } },
    ]);
    expect(badId.skipped).toBe(1);
    expect(badId.bookTypes).toEqual([]);
    expect(extraField.skipped).toBe(1);
    expect(extraField.bookTypes).toEqual([]);
  });
});
