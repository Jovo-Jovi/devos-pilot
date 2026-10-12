import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DateStamp } from "@/components/DateStamp";
import { PendingState } from "@/components/PendingState";
import { libraryNoticesFromRows } from "@/content/rows";
import { isLocale, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { createStaffServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/supabase/staff";
import { StaffFrame } from "../StaffFrame";
import styles from "../staff.module.css";

export default async function StaffNoticesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  return (
    <StaffFrame locale={locale} path="/staff/notices" title={messages.staff.noticesTitle}>
      <Suspense fallback={<PendingState message={messages.staff.pending} />}>
        <StaffNoticesBody locale={locale} />
      </Suspense>
    </StaffFrame>
  );
}

async function StaffNoticesBody({ locale }: { locale: Locale }) {
  await connection();
  await requireStaff(locale);
  const messages = getMessages(locale);
  const supabase = await createStaffServerClient();
  const listed = await supabase
    .from("library_notices")
    .select("id, status, published_on, title_ar, title_en, body_ar, body_en")
    .order("published_on", { ascending: false })
    .order("id", { ascending: true });
  if (listed.error || !listed.data) throw new Error("library_notices");
  const notices = libraryNoticesFromRows(listed.data);
  return (
    <>
      <Link className={styles.editorLink} href={`/${locale}/staff/notices/new`}>
        {messages.staff.newNoticeTitle}
      </Link>
      <ol className="notices">
        {notices.map((notice) => {
          const title = locale === "ar" ? notice.titleAr : notice.titleEn;
          const published = notice.status === "published";
          return (
            <li className="notice" key={notice.id}>
              <DateStamp locale={locale} publishedOn={notice.publishedOn} />
              <div>
                <h2 className={styles.entryTitle}>{title}</h2>
                <p className={published ? styles.statusPublished : styles.statusDraft}>
                  {published
                    ? messages.staff.statusPublished
                    : messages.staff.statusDraft}
                </p>
                <Link className={styles.editorLink} href={`/${locale}/staff/notices/${notice.id}`}>
                  {messages.staff.editLink}
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
