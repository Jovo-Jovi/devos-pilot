"use server";

import { updateTag } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import {
  isLibraryNoticeId,
  parseLibraryNoticeInput,
  type LibraryNoticeField,
} from "@/lib/supabase/library-notice-input";
import { createStaffServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/supabase/staff";

export type LibraryNoticeFormState = {
  error: "invalid" | "save" | null;
  fields?: Partial<Record<LibraryNoticeField, "required" | "date">>;
};

const SAVE_ERROR: LibraryNoticeFormState = { error: "save" };

function assertLocale(locale: string): asserts locale is "ar" | "en" {
  if (!isLocale(locale)) redirect("/ar/staff/sign-in");
}

function finish(
  locale: "ar" | "en",
  id: string,
  done: "saved" | "published" | "unpublished",
): never {
  updateTag("library-notices");
  redirect(`/${locale}/staff/notices/${id}?done=${done}`);
}

export async function createLibraryNotice(
  locale: string,
  previous: LibraryNoticeFormState,
  formData: FormData,
): Promise<LibraryNoticeFormState> {
  void previous;
  assertLocale(locale);
  await requireStaff(locale);
  const parsed = parseLibraryNoticeInput(formData);
  if (!parsed.ok) return { error: "invalid", fields: parsed.fields };
  const supabase = await createStaffServerClient();
  const inserted = await supabase
    .from("library_notices")
    .insert({
      status: "draft",
      published_on: parsed.value.publishedOn,
      title_ar: parsed.value.titleAr,
      title_en: parsed.value.titleEn,
      body_ar: parsed.value.bodyAr,
      body_en: parsed.value.bodyEn,
    })
    .select("id")
    .maybeSingle();
  if (inserted.error || !inserted.data) return SAVE_ERROR;
  finish(locale, inserted.data.id, "saved");
}

export async function updateLibraryNotice(
  locale: string,
  id: string,
  previous: LibraryNoticeFormState,
  formData: FormData,
): Promise<LibraryNoticeFormState> {
  void previous;
  assertLocale(locale);
  await requireStaff(locale);
  if (!isLibraryNoticeId(id)) notFound();
  const parsed = parseLibraryNoticeInput(formData);
  if (!parsed.ok) return { error: "invalid", fields: parsed.fields };
  const supabase = await createStaffServerClient();
  const updated = await supabase
    .from("library_notices")
    .update({
      published_on: parsed.value.publishedOn,
      title_ar: parsed.value.titleAr,
      title_en: parsed.value.titleEn,
      body_ar: parsed.value.bodyAr,
      body_en: parsed.value.bodyEn,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (updated.error || !updated.data) return SAVE_ERROR;
  finish(locale, updated.data.id, "saved");
}

export async function publishLibraryNotice(
  locale: string,
  id: string,
  formData: FormData,
): Promise<LibraryNoticeFormState> {
  void formData;
  assertLocale(locale);
  await requireStaff(locale);
  if (!isLibraryNoticeId(id)) notFound();
  const supabase = await createStaffServerClient();
  const published = await supabase
    .from("library_notices")
    .update({ status: "published" })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (published.error || !published.data) return SAVE_ERROR;
  finish(locale, published.data.id, "published");
}

export async function unpublishLibraryNotice(
  locale: string,
  id: string,
  formData: FormData,
): Promise<LibraryNoticeFormState> {
  void formData;
  assertLocale(locale);
  await requireStaff(locale);
  if (!isLibraryNoticeId(id)) notFound();
  const supabase = await createStaffServerClient();
  const unpublished = await supabase
    .from("library_notices")
    .update({ status: "draft" })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (unpublished.error || !unpublished.data) return SAVE_ERROR;
  finish(locale, unpublished.data.id, "unpublished");
}
