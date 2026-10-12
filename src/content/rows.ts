import type { Database } from "@/lib/supabase/database.types";
import {
  parseLibraryNotices,
  parseOpeningSlots,
  type LibraryNotice,
  type OpeningSlot,
} from "./schema";

export type LibraryNoticeRow =
  Database["public"]["Tables"]["library_notices"]["Row"];
export type OpeningSlotRow =
  Database["public"]["Tables"]["opening_slots"]["Row"];

/** DATA_MODEL §2.1 and §7: columns to `LibraryNotice` fields, validated again by the content schema. */
export function libraryNoticesFromRows(
  rows: readonly LibraryNoticeRow[],
): LibraryNotice[] {
  return parseLibraryNotices(
    rows.map((row) => ({
      id: row.id,
      status: row.status,
      publishedOn: row.published_on,
      titleAr: row.title_ar,
      titleEn: row.title_en,
      bodyAr: row.body_ar,
      bodyEn: row.body_en,
    })),
    "public.library_notices",
  );
}

/** DATA_MODEL §2.2 and §7: a null note pair becomes no note fields, as in the JSON file. */
export function openingSlotsFromRows(
  rows: readonly OpeningSlotRow[],
): OpeningSlot[] {
  return parseOpeningSlots(
    rows.map((row) => ({
      id: row.id,
      dayOfWeek: row.day_of_week,
      opensAt: row.opens_at,
      closesAt: row.closes_at,
      ...(row.note_ar === null ? {} : { noteAr: row.note_ar }),
      ...(row.note_en === null ? {} : { noteEn: row.note_en }),
    })),
    "public.opening_slots",
  );
}
