import "server-only";
import { bookTypesFromDocuments, type BookType } from "@/content/book-types";
import { firestoreForServer } from "./server";

/** One read of `book_types`. No cache (T20) and no write. */
export async function readBookTypes(): Promise<{ bookTypes: BookType[]; skipped: number }> {
  const snapshot = await firestoreForServer().collection("book_types").get();
  return bookTypesFromDocuments(
    snapshot.docs.map((document) => ({ id: document.id, fields: document.data() })),
  );
}
