import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Bidi } from "@/components/Bidi";
import { PendingState } from "@/components/PendingState";
import { isLocale, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { requireStaff } from "@/lib/supabase/staff";
import { signOut } from "./actions";
import { StaffFrame } from "./StaffFrame";
import styles from "./staff.module.css";

export default async function StaffHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  return (
    <StaffFrame locale={locale} path="/staff" title={messages.staff.homeTitle}>
      <Suspense fallback={<PendingState message={messages.staff.pending} />}>
        <StaffHomeBody locale={locale} />
      </Suspense>
    </StaffFrame>
  );
}

async function StaffHomeBody({ locale }: { locale: Locale }) {
  await connection();
  const messages = getMessages(locale);
  const member = await requireStaff(locale);
  return (
    <>
      <p>
        {messages.staff.signedInAs}{" "}
        <Bidi>{member.email}</Bidi>
      </p>
      <form className={styles.form} action={signOut.bind(null, locale)}>
        <button className={styles.secondary} type="submit">
          {messages.staff.signOutSubmit}
        </button>
      </form>
    </>
  );
}
