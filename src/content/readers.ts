import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { readBookTypes } from "@/lib/firebase/book-types";
import { coverPublicUrl } from "@/lib/r2/objects";
import { createPublicReadClient } from "@/lib/supabase/public";
import type { BookType } from "./book-types";
import { orderOpeningSlots } from "./order";
import { libraryNoticesFromRows, openingSlotsFromRows } from "./rows";
import type { LibraryNotice, OpeningSlot } from "./schema";

/** OD-10 §6: published notices, newest first. Filtered here as well as by RLS. */
export async function readPublishedLibraryNotices(): Promise<LibraryNotice[]> {
  "use cache";
  cacheTag("library-notices");
  cacheLife("max");
  const { data, error } = await createPublicReadClient()
    .from("library_notices")
    .select("id, status, published_on, title_ar, title_en, body_ar, body_en")
    .eq("status", "published")
    .order("published_on", { ascending: false })
    .order("id", { ascending: true });
  if (error) throw new Error(`public.library_notices: ${error.message}`);
  return libraryNoticesFromRows(data);
}

/** OD-10 §6: every opening slot, Sunday first, then by opening time. */
export async function readOpeningSlots(): Promise<OpeningSlot[]> {
  "use cache";
  cacheTag("opening-slots");
  cacheLife("max");
  const { data, error } = await createPublicReadClient()
    .from("opening_slots")
    .select("id, day_of_week, opens_at, closes_at, note_ar, note_en")
    .order("day_of_week", { ascending: true })
    .order("opens_at", { ascending: true });
  if (error) throw new Error(`public.opening_slots: ${error.message}`);
  return orderOpeningSlots(openingSlotsFromRows(data));
}

/** DATA_MODEL §12: book types in sort order. The list is read at request time (OD-11 §4). */
export async function readLibraryBookTypes(): Promise<BookType[]> {
  "use cache";
  cacheTag("book-types");
  cacheLife("hours");
  return (await readBookTypes()).bookTypes;
}

/** DATA_MODEL §10: cover links, read at request time. A row whose type is absent is ignored by the page. */
export async function readBookTypeCovers(): Promise<{ bookTypeId: string; coverUrl: string }[]> {
  "use cache";
  cacheTag("book-type-covers");
  cacheLife("minutes");
  const { data, error } = await createPublicReadClient()
    .from("book_type_covers")
    .select("book_type_id, object_key");
  if (error) throw new Error(`public.book_type_covers: ${error.message}`);
  return data.map((row) => ({
    bookTypeId: row.book_type_id,
    coverUrl: coverPublicUrl(row.object_key),
  }));
}
