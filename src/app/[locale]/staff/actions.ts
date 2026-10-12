"use server";

import { redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import {
  checkNewPassword,
  decidePasswordAccess,
  decideStaffAccess,
} from "@/lib/supabase/staff-access";
import { createStaffServerClient } from "@/lib/supabase/server";

export type StaffFormState = {
  error: "generic" | "code" | "mismatch" | "password" | null;
};

export type StaffTotpEnrolment = {
  factorId: string;
  secret: string;
  qr: string;
};

function assertLocale(locale: string): asserts locale is "ar" | "en" {
  if (!isLocale(locale)) redirect("/ar/staff/sign-in");
}

export async function signInStaff(
  locale: string,
  previous: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  void previous;
  assertLocale(locale);
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createStaffServerClient();
  const signedIn = await supabase.auth.signInWithPassword({ email, password });
  if (signedIn.error) return { error: "generic" };

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const decision = decideStaffAccess({
    account: user
      ? {
          id: user.id,
          email: user.email ?? "",
          staffClaim: user.app_metadata?.staff,
        }
      : null,
    currentLevel: "aal1",
  });
  if (decision.outcome !== "mfa") {
    await supabase.auth.signOut();
    redirect(`/${locale}/staff/sign-in?error=refused`);
  }
  redirect(`/${locale}/staff/mfa`);
}

export async function enrollStaffTotp(): Promise<
  StaffTotpEnrolment | { error: "code" }
> {
  const supabase = await createStaffServerClient();
  const listed = await supabase.auth.mfa.listFactors();
  if (listed.error || !listed.data) return { error: "code" };
  const unverified = listed.data.all.filter(
    (factor) => factor.factor_type === "totp" && factor.status === "unverified",
  );
  for (const factor of unverified) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }
  const enrolled = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "staff-totp",
  });
  const totp = enrolled.data?.totp;
  if (enrolled.error || !enrolled.data || !totp) return { error: "code" };
  return { factorId: enrolled.data.id, secret: totp.secret, qr: totp.qr_code };
}

export async function verifyStaffCode(
  locale: string,
  previous: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  void previous;
  assertLocale(locale);
  const supabase = await createStaffServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect(`/${locale}/staff/sign-in`);
  if (user.app_metadata?.staff !== true) {
    await supabase.auth.signOut();
    redirect(`/${locale}/staff/sign-in?error=refused`);
  }
  const factorId = String(formData.get("factorId") ?? "");
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data) return { error: "code" };
  const verified = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code,
  });
  if (verified.error) return { error: "code" };
  redirect(`/${locale}/staff`);
}

export async function setStaffPassword(
  locale: string,
  previous: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  void previous;
  assertLocale(locale);
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
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (checkNewPassword(password, confirmation) === "mismatch") {
    return { error: "mismatch" };
  }
  const updated = await supabase.auth.updateUser({ password });
  if (updated.error) return { error: "password" };
  redirect(`/${locale}/staff/mfa`);
}

export async function signOut(locale: string, formData: FormData): Promise<void> {
  void formData;
  assertLocale(locale);
  const supabase = await createStaffServerClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/staff/sign-in`);
}
