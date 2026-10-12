"use server";

import { updateTag } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import {
  isOpeningSlotId,
  parseOpeningSlotInput,
  type OpeningSlotError,
  type OpeningSlotField,
  type OpeningSlotInput,
} from "@/lib/supabase/opening-slot-input";
import { createStaffServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/supabase/staff";

export type OpeningSlotFormState = {
  error: "invalid" | "save" | null;
  fields?: Partial<Record<OpeningSlotField, OpeningSlotError>>;
};

const SAVE_ERROR: OpeningSlotFormState = { error: "save" };

function assertLocale(locale: string): asserts locale is "ar" | "en" {
  if (!isLocale(locale)) redirect("/ar/staff/sign-in");
}

function finish(locale: "ar" | "en", done: "added" | "changed" | "removed"): never {
  updateTag("opening-slots");
  redirect(`/${locale}/staff/hours?done=${done}`);
}

function columns(value: OpeningSlotInput) {
  return {
    day_of_week: value.dayOfWeek,
    opens_at: value.opensAt,
    closes_at: value.closesAt,
    note_ar: value.noteAr,
    note_en: value.noteEn,
  };
}

export async function addOpeningSlot(
  locale: string,
  previous: OpeningSlotFormState,
  formData: FormData,
): Promise<OpeningSlotFormState> {
  void previous;
  assertLocale(locale);
  await requireStaff(locale);
  const parsed = parseOpeningSlotInput(formData);
  if (!parsed.ok) return { error: "invalid", fields: parsed.fields };
  const supabase = await createStaffServerClient();
  const inserted = await supabase
    .from("opening_slots")
    .insert(columns(parsed.value))
    .select("id")
    .maybeSingle();
  if (inserted.error || !inserted.data) return SAVE_ERROR;
  finish(locale, "added");
}

export async function changeOpeningSlot(
  locale: string,
  id: string,
  previous: OpeningSlotFormState,
  formData: FormData,
): Promise<OpeningSlotFormState> {
  void previous;
  assertLocale(locale);
  await requireStaff(locale);
  if (!isOpeningSlotId(id)) notFound();
  const parsed = parseOpeningSlotInput(formData);
  if (!parsed.ok) return { error: "invalid", fields: parsed.fields };
  const supabase = await createStaffServerClient();
  const updated = await supabase
    .from("opening_slots")
    .update(columns(parsed.value))
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (updated.error || !updated.data) return SAVE_ERROR;
  finish(locale, "changed");
}

export async function removeOpeningSlot(
  locale: string,
  id: string,
  formData: FormData,
): Promise<void> {
  void formData;
  assertLocale(locale);
  await requireStaff(locale);
  if (!isOpeningSlotId(id)) notFound();
  const supabase = await createStaffServerClient();
  const removed = await supabase
    .from("opening_slots")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (removed.error || !removed.data) {
    redirect(`/${locale}/staff/hours?error=save`);
  }
  finish(locale, "removed");
}
