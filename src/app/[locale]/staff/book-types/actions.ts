"use server";

import { updateTag } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { readBookTypes } from "@/lib/firebase/book-types";
import { COVER_MAX_BYTES, coverObjectKey, prepareCoverImage } from "@/lib/r2/cover-image";
import { deleteCoverObject, putCoverObject } from "@/lib/r2/objects";
import { createStaffServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/supabase/staff";

export type BookTypeCoverFormState = { error: "tooLarge" | "wrongType" | "save" | null };

const SAVE: BookTypeCoverFormState = { error: "save" };

function assertLocale(locale: string): asserts locale is "ar" | "en" {
  if (!isLocale(locale)) redirect("/ar/staff/sign-in");
}

async function assertBookType(bookTypeId: string): Promise<void> {
  const catalogue = await readBookTypes();
  if (!catalogue.bookTypes.some((bookType) => bookType.id === bookTypeId)) notFound();
}

export async function uploadBookTypeCover(
  locale: string,
  bookTypeId: string,
  previous: BookTypeCoverFormState,
  formData: FormData,
): Promise<BookTypeCoverFormState> {
  void previous;
  assertLocale(locale);
  await requireStaff(locale);
  await assertBookType(bookTypeId);
  const cover = formData.get("cover");
  if (!(cover instanceof File) || cover.size === 0) return { error: "wrongType" };
  if (cover.size > COVER_MAX_BYTES) return { error: "tooLarge" };
  const prepared = await prepareCoverImage(new Uint8Array(await cover.arrayBuffer()));
  if (!prepared.ok) return { error: prepared.refusal };
  const supabase = await createStaffServerClient();
  const current = await supabase
    .from("book_type_covers")
    .select("object_key")
    .eq("book_type_id", bookTypeId)
    .maybeSingle();
  if (current.error) return SAVE;
  const previousKey = current.data?.object_key;
  const objectKey = coverObjectKey(bookTypeId);
  try {
    await putCoverObject(objectKey, prepared.webp);
  } catch {
    return SAVE;
  }
  const written = await supabase
    .from("book_type_covers")
    .upsert({ book_type_id: bookTypeId, object_key: objectKey }, { onConflict: "book_type_id" })
    .select("book_type_id")
    .maybeSingle();
  if (written.error || !written.data) {
    try {
      await deleteCoverObject(objectKey);
    } catch {
      // The new object is unused when the link is not written.
    }
    return SAVE;
  }
  if (previousKey) {
    try {
      await deleteCoverObject(previousKey);
    } catch {
      // An object whose delete fails is left orphaned (DATA_MODEL §11).
    }
  }
  updateTag("book-type-covers");
  redirect(`/${locale}/staff/book-types?done=saved`);
}

export async function removeBookTypeCover(
  locale: string,
  bookTypeId: string,
  formData: FormData,
): Promise<void> {
  void formData;
  assertLocale(locale);
  await requireStaff(locale);
  await assertBookType(bookTypeId);
  const supabase = await createStaffServerClient();
  const removed = await supabase
    .from("book_type_covers")
    .delete()
    .eq("book_type_id", bookTypeId)
    .select("object_key")
    .maybeSingle();
  if (removed.error || !removed.data) {
    redirect(`/${locale}/staff/book-types?error=save`);
  }
  try {
    await deleteCoverObject(removed.data.object_key);
  } catch {
    // An object whose delete fails is left orphaned (DATA_MODEL §11).
  }
  updateTag("book-type-covers");
  redirect(`/${locale}/staff/book-types?done=removed`);
}
