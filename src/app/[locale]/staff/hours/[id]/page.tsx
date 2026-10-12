import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PendingState } from "@/components/PendingState";
import { openingSlotsFromRows } from "@/content/rows";
import { isLocale, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { isOpeningSlotId } from "@/lib/supabase/opening-slot-input";
import { createStaffServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/supabase/staff";
import { OpeningSlotForm } from "../../OpeningSlotForm";
import { StaffFrame } from "../../StaffFrame";
import styles from "../../staff.module.css";
import { changeOpeningSlot } from "../actions";

export default function EditOpeningSlotPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <EditOpeningSlotFrame params={params} />
    </Suspense>
  );
}

async function EditOpeningSlotFrame({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  return (
    <StaffFrame
      locale={locale}
      path={`/staff/hours/${id}`}
      title={messages.staff.editSlotTitle}
    >
      <Suspense fallback={<PendingState message={messages.staff.pending} />}>
        <EditOpeningSlotBody locale={locale} id={id} />
      </Suspense>
    </StaffFrame>
  );
}

async function EditOpeningSlotBody({ locale, id }: { locale: Locale; id: string }) {
  await connection();
  await requireStaff(locale);
  if (!isOpeningSlotId(id)) notFound();
  const messages = getMessages(locale);
  const supabase = await createStaffServerClient();
  const loaded = await supabase
    .from("opening_slots")
    .select("id, day_of_week, opens_at, closes_at, note_ar, note_en")
    .eq("id", id)
    .maybeSingle();
  if (loaded.error || !loaded.data) notFound();
  const [slot] = openingSlotsFromRows([loaded.data]);
  if (!slot) notFound();
  return (
    <>
      <OpeningSlotForm
        action={changeOpeningSlot.bind(null, locale, slot.id)}
        copy={messages.staff}
        days={messages.days}
        values={{
          dayOfWeek: slot.dayOfWeek,
          opensAt: slot.opensAt,
          closesAt: slot.closesAt,
          noteAr: slot.noteAr ?? null,
          noteEn: slot.noteEn ?? null,
        }}
      />
      <Link className={styles.editorLink} href={`/${locale}/staff/hours`}>
        {messages.staff.backToHours}
      </Link>
    </>
  );
}
