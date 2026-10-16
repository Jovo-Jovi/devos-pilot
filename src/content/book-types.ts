import { z } from "zod";

/** DATA_MODEL §12: kebab-case document id. */
const BOOK_TYPE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type BookType = {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  sortOrder: number;
};

export type BookTypeDocument = { id: string; fields: unknown };

/**
 * DATA_MODEL §12: the five fields, strict. Strings are non-blank after trim.
 * `sortOrder` is an integer ≥ 0. An extra key fails the parse.
 */
const bookTypeFieldsSchema = z.strictObject({
  nameAr: z.string().trim().min(1),
  nameEn: z.string().trim().min(1),
  descriptionAr: z.string().trim().min(1),
  descriptionEn: z.string().trim().min(1),
  sortOrder: z.number().int().nonnegative(),
});

function compareBookTypes(left: BookType, right: BookType): number {
  if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

/**
 * Parses Firestore documents into `BookType`s. A document whose id is not
 * kebab-case, or whose fields do not parse, is skipped and counted.
 * The result is sorted by `sortOrder` ascending, then `id` ascending.
 */
export function bookTypesFromDocuments(documents: readonly BookTypeDocument[]): {
  bookTypes: BookType[];
  skipped: number;
} {
  const bookTypes: BookType[] = [];
  let skipped = 0;
  for (const document of documents) {
    if (!BOOK_TYPE_ID.test(document.id)) {
      skipped += 1;
      continue;
    }
    const parsed = bookTypeFieldsSchema.safeParse(document.fields);
    if (!parsed.success) {
      skipped += 1;
      continue;
    }
    bookTypes.push({ id: document.id, ...parsed.data });
  }
  bookTypes.sort(compareBookTypes);
  return { bookTypes, skipped };
}
