import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PendingState } from "@/components/PendingState";
import { isLocale, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { requireStaff } from "@/lib/supabase/staff";
import { NoticeForm } from "../../NoticeForm";
import { StaffFrame } from "../../StaffFrame";
import { createLibraryNotice } from "../actions";

export default async function NewLibraryNoticePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  return (
    <StaffFrame
      locale={locale}
      path="/staff/notices/new"
      title={messages.staff.newNoticeTitle}
    >
      <Suspense fallback={<PendingState message={messages.staff.pending} />}>
        <NewLibraryNoticeBody locale={locale} />
      </Suspense>
    </StaffFrame>
  );
}

async function NewLibraryNoticeBody({ locale }: { locale: Locale }) {
  await connection();
  await requireStaff(locale);
  const messages = getMessages(locale);
  return (
    <NoticeForm action={createLibraryNotice.bind(null, locale)} copy={messages.staff} />
  );
}
