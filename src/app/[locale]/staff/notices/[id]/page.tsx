import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PendingState } from "@/components/PendingState";
import { libraryNoticesFromRows } from "@/content/rows";
import { isLocale, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import {
  isLibraryNoticeId,
  parseNoticeDone,
} from "@/lib/supabase/library-notice-input";
import { createStaffServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/supabase/staff";
import { NoticeForm } from "../../NoticeForm";
import { StaffFrame } from "../../StaffFrame";
import styles from "../../staff.module.css";
import {
  publishLibraryNotice,
  unpublishLibraryNotice,
  updateLibraryNotice,
  type LibraryNoticeFormState,
} from "../actions";

/** A plain form ignores the action result. The action still returns it. */
function voidAction(
  action: (formData: FormData) => Promise<LibraryNoticeFormState>,
): (formData: FormData) => Promise<void> {
  return action as unknown as (formData: FormData) => Promise<void>;
}

export default function EditLibraryNoticePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ done?: string | string[] }>;
}) {
  return (
    <Suspense fallback={null}>
      <EditLibraryNoticeFrame params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditLibraryNoticeFrame({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ done?: string | string[] }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  return (
    <StaffFrame
      locale={locale}
      path={`/staff/notices/${id}`}
      title={messages.staff.editNoticeTitle}
    >
      <Suspense fallback={<PendingState message={messages.staff.pending} />}>
        <EditLibraryNoticeBody locale={locale} id={id} searchParams={searchParams} />
      </Suspense>
    </StaffFrame>
  );
}

async function EditLibraryNoticeBody({
  locale,
  id,
  searchParams,
}: {
  locale: Locale;
  id: string;
  searchParams: Promise<{ done?: string | string[] }>;
}) {
  await connection();
  await requireStaff(locale);
  if (!isLibraryNoticeId(id)) notFound();
  const messages = getMessages(locale);
  const supabase = await createStaffServerClient();
  const loaded = await supabase
    .from("library_notices")
    .select("id, status, published_on, title_ar, title_en, body_ar, body_en")
    .eq("id", id)
    .maybeSingle();
  if (loaded.error || !loaded.data) notFound();
  const [notice] = libraryNoticesFromRows([loaded.data]);
  if (!notice) notFound();
  const { done } = await searchParams;
  const outcome = parseNoticeDone(Array.isArray(done) ? done[0] : done);
  const published = notice.status === "published";
  const confirmation =
    outcome === "saved"
      ? messages.staff.confirmSaved
      : outcome === "published"
        ? messages.staff.confirmPublished
        : outcome === "unpublished"
          ? messages.staff.confirmUnpublished
          : null;
  return (
    <>
      {confirmation ? (
        <p className={styles.confirm} role="status">
          {confirmation}
        </p>
      ) : null}
      <p className={published ? styles.statusPublished : styles.statusDraft}>
        {published ? messages.staff.statusPublished : messages.staff.statusDraft}
      </p>
      <NoticeForm
        action={updateLibraryNotice.bind(null, locale, notice.id)}
        copy={messages.staff}
        values={{
          publishedOn: notice.publishedOn,
          titleAr: notice.titleAr,
          titleEn: notice.titleEn,
          bodyAr: notice.bodyAr,
          bodyEn: notice.bodyEn,
        }}
      />
      {published ? (
        <form action={voidAction(unpublishLibraryNotice.bind(null, locale, notice.id))}>
          <button className={styles.secondary} type="submit">
            {messages.staff.unpublishSubmit}
          </button>
        </form>
      ) : (
        <form action={voidAction(publishLibraryNotice.bind(null, locale, notice.id))}>
          <button className={styles.secondary} type="submit">
            {messages.staff.publishSubmit}
          </button>
        </form>
      )}
      <Link className={styles.editorLink} href={`/${locale}/staff/notices`}>
        {messages.staff.backToNotices}
      </Link>
    </>
  );
}
