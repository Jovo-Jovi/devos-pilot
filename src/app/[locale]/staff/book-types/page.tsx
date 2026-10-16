import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BookCover } from "@/components/BookCover";
import { PendingState } from "@/components/PendingState";
import { isLocale, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { readBookTypes } from "@/lib/firebase/book-types";
import { coverPublicUrl } from "@/lib/r2/objects";
import { createStaffServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/supabase/staff";
import { CoverForm } from "../CoverForm";
import { StaffFrame } from "../StaffFrame";
import styles from "../staff.module.css";
import { removeBookTypeCover, uploadBookTypeCover } from "./actions";

export default async function StaffBookTypesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ done?: string | string[]; error?: string | string[] }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  return (
    <StaffFrame locale={locale} path="/staff/book-types" title={messages.staff.bookTypesTitle}>
      <Suspense fallback={<PendingState message={messages.staff.pending} />}>
        <StaffBookTypesBody locale={locale} searchParams={searchParams} />
      </Suspense>
    </StaffFrame>
  );
}

async function StaffBookTypesBody({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: Promise<{ done?: string | string[]; error?: string | string[] }>;
}) {
  await connection();
  await requireStaff(locale);
  const messages = getMessages(locale);
  const supabase = await createStaffServerClient();
  const [catalogue, listed] = await Promise.all([
    readBookTypes(),
    supabase.from("book_type_covers").select("book_type_id, object_key"),
  ]);
  if (listed.error || !listed.data) throw new Error("book_type_covers");
  const known = new Set(catalogue.bookTypes.map((bookType) => bookType.id));
  const covers = new Map<string, string>();
  for (const row of listed.data) {
    if (!known.has(row.book_type_id)) continue;
    covers.set(row.book_type_id, coverPublicUrl(row.object_key));
  }
  const query = await searchParams;
  const done = Array.isArray(query.done) ? query.done[0] : query.done;
  const errorValue = Array.isArray(query.error) ? query.error[0] : query.error;
  const confirmation =
    done === "saved" ? messages.staff.coverSaved : done === "removed" ? messages.staff.coverRemoved : null;
  return (
    <>
      {confirmation ? (
        <p className={styles.confirm} role="status">
          {confirmation}
        </p>
      ) : null}
      {errorValue === "save" ? (
        <p className={styles.error} role="status">
          {messages.staff.coverSaveError}
        </p>
      ) : null}
      {catalogue.bookTypes.length === 0 ? (
        <PendingState message={messages.state.pendingBookTypes} />
      ) : (
        <ol className="book-types">
          {catalogue.bookTypes.map((bookType) => {
            const coverUrl = covers.get(bookType.id);
            const name = locale === "ar" ? bookType.nameAr : bookType.nameEn;
            return (
              <li className="book-type" key={bookType.id}>
                <BookCover src={coverUrl} />
                <div className={styles.coverColumn}>
                  <h2>{name}</h2>
                  <CoverForm
                    action={uploadBookTypeCover.bind(null, locale, bookType.id)}
                    copy={messages.staff}
                    bookTypeId={bookType.id}
                    hasCover={coverUrl !== undefined}
                  />
                  {coverUrl ? (
                    <form
                      className={styles.removeForm}
                      action={removeBookTypeCover.bind(null, locale, bookType.id)}
                    >
                      <button className={styles.secondary} type="submit">
                        {messages.staff.coverRemove}
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
