import "server-only";
import { redirect } from "next/navigation";
import { decideStaffAccess, type StaffMember } from "./staff-access";
import { createStaffServerClient } from "./server";

export type { StaffMember };

/** Staff home gate: getUser, then the assurance level. Never trusts getSession alone. */
export async function requireStaff(locale: string): Promise<StaffMember> {
  const supabase = await createStaffServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const assurance = user
    ? await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    : { data: null };
  const decision = decideStaffAccess({
    account: user
      ? {
          id: user.id,
          email: user.email ?? "",
          staffClaim: user.app_metadata?.staff,
        }
      : null,
    currentLevel: assurance.data?.currentLevel ?? null,
  });
  if (decision.outcome === "sign-in") {
    redirect(`/${locale}/staff/sign-in`);
  }
  if (decision.outcome === "refused") {
    await supabase.auth.signOut();
    redirect(`/${locale}/staff/sign-in?error=refused`);
  }
  if (decision.outcome === "mfa") {
    redirect(`/${locale}/staff/mfa`);
  }
  return decision.member;
}
