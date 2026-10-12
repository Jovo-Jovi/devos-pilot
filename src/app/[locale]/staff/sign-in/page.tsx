import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PendingState } from "@/components/PendingState";
import { isLocale, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { signInStaff } from "../actions";
import { SignInForm } from "../SignInForm";
import { StaffFrame } from "../StaffFrame";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  return (
    <StaffFrame locale={locale} path="/staff/sign-in" title={messages.staff.signInTitle}>
      <Suspense fallback={<PendingState message={messages.staff.pending} />}>
        <SignInPanel locale={locale} searchParams={searchParams} />
      </Suspense>
    </StaffFrame>
  );
}

async function SignInPanel({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const messages = getMessages(locale);
  return (
    <SignInForm
      action={signInStaff.bind(null, locale)}
      refused={error === "refused"}
      linkError={error === "link"}
      copy={messages.staff}
    />
  );
}
