import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { PendingState } from "@/components/PendingState";
import { isLocale, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { decidePasswordAccess } from "@/lib/supabase/staff-access";
import { createStaffServerClient } from "@/lib/supabase/server";
import { setStaffPassword } from "../actions";
import { PasswordForm } from "../PasswordForm";
import { StaffFrame } from "../StaffFrame";

export default async function PasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  return (
    <StaffFrame locale={locale} path="/staff/password" title={messages.staff.passwordTitle}>
      <Suspense fallback={<PendingState message={messages.staff.pending} />}>
        <PasswordPanel locale={locale} />
      </Suspense>
    </StaffFrame>
  );
}

async function PasswordPanel({ locale }: { locale: Locale }) {
  await connection();
  const supabase = await createStaffServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const listed = await supabase.auth.mfa.listFactors();
  const decision = decidePasswordAccess({
    account: user
      ? {
          id: user.id,
          email: user.email ?? "",
          staffClaim: user.app_metadata?.staff,
        }
      : null,
    hasVerifiedFactor: (listed.data?.totp?.length ?? 0) > 0,
  });
  if (decision === "sign-in") redirect(`/${locale}/staff/sign-in`);
  if (decision === "refused") {
    await supabase.auth.signOut();
    redirect(`/${locale}/staff/sign-in?error=refused`);
  }
  if (decision === "mfa") redirect(`/${locale}/staff/mfa`);
  const messages = getMessages(locale);
  return (
    <PasswordForm action={setStaffPassword.bind(null, locale)} copy={messages.staff} />
  );
}
