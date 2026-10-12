import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PendingState } from "@/components/PendingState";
import { isLocale, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { parseDayOfWeek } from "@/lib/supabase/opening-slot-input";
import { requireStaff } from "@/lib/supabase/staff";
import { OpeningSlotForm } from "../../OpeningSlotForm";
import { StaffFrame } from "../../StaffFrame";
import styles from "../../staff.module.css";
import { addOpeningSlot } from "../actions";

export default async function NewOpeningSlotPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ day?: string | string[] }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  return (
    <StaffFrame locale={locale} path="/staff/hours/new" title={messages.staff.addSlotTitle}>
      <Suspense fallback={<PendingState message={messages.staff.pending} />}>
        <NewOpeningSlotBody locale={locale} searchParams={searchParams} />
      </Suspense>
    </StaffFrame>
  );
}

async function NewOpeningSlotBody({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: Promise<{ day?: string | string[] }>;
}) {
  await connection();
  await requireStaff(locale);
  const messages = getMessages(locale);
  const { day } = await searchParams;
  const dayOfWeek = parseDayOfWeek(Array.isArray(day) ? day[0] : day) ?? 6;
  return (
    <>
      <OpeningSlotForm
        action={addOpeningSlot.bind(null, locale)}
        copy={messages.staff}
        days={messages.days}
        values={{
          dayOfWeek,
          opensAt: "",
          closesAt: "",
          noteAr: null,
          noteEn: null,
        }}
      />
      <Link className={styles.editorLink} href={`/${locale}/staff/hours`}>
        {messages.staff.backToHours}
      </Link>
    </>
  );
}
