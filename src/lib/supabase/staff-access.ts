export type StaffMember = { id: string; email: string };

/** A signed-in account as the gate sees it. The staff claim is JSON `true` only. */
export type StaffClaimAccount = {
  id: string;
  email: string;
  staffClaim: unknown;
};

export type StaffAccessDecision =
  | { outcome: "sign-in" }
  | { outcome: "refused" }
  | { outcome: "mfa" }
  | { outcome: "member"; member: StaffMember };

export function isStaffClaim(staffClaim: unknown): boolean {
  return staffClaim === true;
}

/**
 * The four gate outcomes, in order: no account, staff claim not JSON true,
 * assurance level not aal2, otherwise the staff member.
 */
export function decideStaffAccess(input: {
  account: StaffClaimAccount | null;
  currentLevel: string | null;
}): StaffAccessDecision {
  if (!input.account) return { outcome: "sign-in" };
  if (!isStaffClaim(input.account.staffClaim)) return { outcome: "refused" };
  if (input.currentLevel !== "aal2") return { outcome: "mfa" };
  return {
    outcome: "member",
    member: { id: input.account.id, email: input.account.email },
  };
}
