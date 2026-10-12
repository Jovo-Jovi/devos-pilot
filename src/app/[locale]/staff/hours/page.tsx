import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Bidi } from "@/components/Bidi";
import { PendingState } from "@/components/PendingState";
import { openingSlotsFromRows } from "@/content/rows";
import { timetableDays } from "@/content/timetable";
import { isLocale, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { parseHoursDone } from "@/lib/supabase/opening-slot-input";
import { createStaffServerClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/supabase/staff";
import { StaffFrame } from "../StaffFrame";
import styles from "../staff.module.css";
import { removeOpeningSlot } from "./actions";

export default async function StaffHoursPage({
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
    <StaffFrame locale={locale} path="/staff/hours" title={messages.staff.hoursTitle}>
      <Suspense fallback={<PendingState message={messages.staff.pending} />}>
        <StaffHoursBody locale={locale} searchParams={searchParams} />
      </Suspense>
    </StaffFrame>
  );
}

async function StaffHoursBody({
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
  const listed = await supabase
    .from("opening_slots")
    .select("id, day_of_week, opens_at, closes_at, note_ar, note_en");
  if (listed.error || !listed.data) throw new Error("opening_slots");
  const days = timetableDays(openingSlotsFromRows(listed.data));
  const query = await searchParams;
  const done = Array.isArray(query.done) ? query.done[0] : query.done;
  const outcome = parseHoursDone(done);
  const errorValue = Array.isArray(query.error) ? query.error[0] : query.error;
  const confirmation =
    outcome === "added"
      ? messages.staff.confirmAdded
      : outcome === "changed"
        ? messages.staff.confirmChanged
        : outcome === "removed"
          ? messages.staff.confirmRemoved
          : null;
  return (
    <>
      {confirmation ? (
        <p className={styles.confirm} role="status">
          {confirmation}
        </p>
      ) : null}
      {errorValue === "save" ? (
        <p className={styles.error} role="status">
          {messages.staff.hoursErrorSave}
        </p>
      ) : null}
      <ol className={styles.dayList}>
        {days.map((day) => {
          const dayName =
            messages.days[String(day.dayOfWeek) as keyof typeof messages.days];
          return (
            <li className={styles.day} key={day.dayOfWeek}>
              <h2 className={styles.dayTitle}>{dayName}</h2>
              {day.slots.length === 0 ? (
                <p className={styles.closedDay}>{messages.state.closed}</p>
              ) : (
                <ul className={styles.periodList}>
                  {day.slots.map((slot) => {
                    const note = locale === "ar" ? slot.noteAr : slot.noteEn;
                    return (
                      <li className={styles.period} key={slot.id}>
                        <p className={styles.periodTimes}>
                          <Bidi>
                            {slot.opensAt}–{slot.closesAt}
                          </Bidi>
                        </p>
                        {note ? <p className={styles.periodNote}>{note}</p> : null}
                        <div className={styles.periodActions}>
                          <Link
                            className={styles.editorLink}
                            href={`/${locale}/staff/hours/${slot.id}`}
                          >
                            {messages.staff.changeSlotLink}
                          </Link>
                          <form
                            className={styles.removeForm}
                            action={removeOpeningSlot.bind(null, locale, slot.id)}
                          >
                            <button className={styles.secondary} type="submit">
                              {messages.staff.removeSlotSubmit}
                            </button>
                          </form>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link
                className={styles.editorLink}
                href={`/${locale}/staff/hours/new?day=${day.dayOfWeek}`}
              >
                {messages.staff.addSlotTitle}
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}
