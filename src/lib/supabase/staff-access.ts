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

/**
 * The invitation link only. Any other type, including recovery, is refused
 * (OD-10 §3 has no password recovery).
 */
export function parseInviteLink(params: URLSearchParams): { tokenHash: string } | null {
  if (params.get("type") !== "invite") return null;
  const tokenHash = params.get("token_hash");
  if (!tokenHash) return null;
  return { tokenHash };
}

export type PasswordAccess = "sign-in" | "refused" | "mfa" | "allowed";

/**
 * Setting a password serves the invitation only. An enrolled account is sent
 * to the authenticator: changing that password is account management (OD-10).
 * Order: no account, claim not JSON true, verified TOTP, otherwise allowed.
 */
export function decidePasswordAccess(input: {
  account: StaffClaimAccount | null;
  hasVerifiedFactor: boolean;
}): PasswordAccess {
  if (!input.account) return "sign-in";
  if (!isStaffClaim(input.account.staffClaim)) return "refused";
  if (input.hasVerifiedFactor) return "mfa";
  return "allowed";
}

/** The two password fields. A mismatch is the only named outcome. */
export function checkNewPassword(
  password: string,
  confirmation: string,
): "mismatch" | null {
  if (password !== confirmation) return "mismatch";
  return null;
}
