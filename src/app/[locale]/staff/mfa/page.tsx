import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { PendingState } from "@/components/PendingState";
import { isLocale, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { isStaffClaim } from "@/lib/supabase/staff-access";
import { createStaffServerClient } from "@/lib/supabase/server";
import { enrollStaffTotp, verifyStaffCode } from "../actions";
import { MfaForm } from "../MfaForm";
import { StaffFrame } from "../StaffFrame";
import styles from "../staff.module.css";

export default async function MfaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  return (
    <StaffFrame locale={locale} path="/staff/mfa" title={messages.staff.mfaTitle}>
      <Suspense fallback={<PendingState message={messages.staff.pending} />}>
        <MfaPanel locale={locale} />
      </Suspense>
    </StaffFrame>
  );
}

async function MfaPanel({ locale }: { locale: Locale }) {
  await connection();
  const messages = getMessages(locale);
  const supabase = await createStaffServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect(`/${locale}/staff/sign-in`);
  if (!isStaffClaim(user.app_metadata?.staff)) {
    await supabase.auth.signOut();
    redirect(`/${locale}/staff/sign-in?error=refused`);
  }
  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.data?.currentLevel === "aal2") redirect(`/${locale}/staff`);

  const listed = await supabase.auth.mfa.listFactors();
  const verified = listed.data?.totp ?? [];
  const first = verified[0];
  if (first) {
    return (
      <MfaForm
        action={verifyStaffCode.bind(null, locale)}
        copy={messages.staff}
        factorId={first.id}
        secret={null}
        qr={null}
      />
    );
  }

  const enrolled = await enrollStaffTotp();
  if ("error" in enrolled) {
    return (
      <p className={styles.error} role="status">
        {messages.staff.errorCode}
      </p>
    );
  }
  return (
    <MfaForm
      action={verifyStaffCode.bind(null, locale)}
      copy={messages.staff}
      factorId={enrolled.factorId}
      secret={enrolled.secret}
      qr={enrolled.qr}
    />
  );
}
