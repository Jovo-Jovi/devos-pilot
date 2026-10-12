import { describe, expect, it } from "vitest";
import { decideStaffAccess } from "./staff-access";

const staffAccount = {
  id: "a14a14a1-14a1-44a1-84a1-14a114a114a1",
  email: "staff-enrol@example.com",
  staffClaim: true,
};

describe("decideStaffAccess", () => {
  it("sends a missing account to sign-in", () => {
    expect(decideStaffAccess({ account: null, currentLevel: null })).toEqual({
      outcome: "sign-in",
    });
    expect(decideStaffAccess({ account: null, currentLevel: "aal2" })).toEqual({
      outcome: "sign-in",
    });
  });

  it("refuses an account whose staff claim is not JSON true", () => {
    for (const staffClaim of [undefined, false, "true", 1, null]) {
      expect(
        decideStaffAccess({
          account: { ...staffAccount, staffClaim },
          currentLevel: "aal2",
        }),
      ).toEqual({ outcome: "refused" });
    }
  });

  it("sends staff below aal2 to the authenticator", () => {
    expect(
      decideStaffAccess({ account: staffAccount, currentLevel: "aal1" }),
    ).toEqual({ outcome: "mfa" });
    expect(
      decideStaffAccess({ account: staffAccount, currentLevel: null }),
    ).toEqual({ outcome: "mfa" });
  });

  it("returns the staff member at aal2", () => {
    expect(
      decideStaffAccess({ account: staffAccount, currentLevel: "aal2" }),
    ).toEqual({
      outcome: "member",
      member: { id: staffAccount.id, email: staffAccount.email },
    });
  });
});
