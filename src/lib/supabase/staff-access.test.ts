import { describe, expect, it } from "vitest";
import {
  checkNewPassword,
  decidePasswordAccess,
  decideStaffAccess,
  parseInviteLink,
} from "./staff-access";

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

describe("parseInviteLink", () => {
  it("returns the token only when the type is invite and the token is non-empty", () => {
    expect(
      parseInviteLink(
        new URLSearchParams("type=invite&token_hash=synthetic-token&next=other"),
      ),
    ).toEqual({ tokenHash: "synthetic-token" });
  });

  it("refuses recovery, signup, magiclink, email change, a missing type, and a missing or empty token", () => {
    for (const query of [
      "type=recovery&token_hash=synthetic-token",
      "type=signup&token_hash=synthetic-token",
      "type=magiclink&token_hash=synthetic-token",
      "type=email_change&token_hash=synthetic-token",
      "token_hash=synthetic-token",
      "type=invite",
      "type=invite&token_hash=",
    ]) {
      expect(parseInviteLink(new URLSearchParams(query))).toBeNull();
    }
  });
});

describe("decidePasswordAccess", () => {
  it("sends a missing account to sign-in before the other checks", () => {
    expect(
      decidePasswordAccess({ account: null, hasVerifiedFactor: false }),
    ).toBe("sign-in");
    expect(
      decidePasswordAccess({ account: null, hasVerifiedFactor: true }),
    ).toBe("sign-in");
  });

  it("refuses an account whose staff claim is not JSON true", () => {
    for (const staffClaim of [undefined, false, "true", 1, null]) {
      expect(
        decidePasswordAccess({
          account: { ...staffAccount, staffClaim },
          hasVerifiedFactor: true,
        }),
      ).toBe("refused");
    }
  });

  it("sends an enrolled account to the authenticator", () => {
    expect(
      decidePasswordAccess({ account: staffAccount, hasVerifiedFactor: true }),
    ).toBe("mfa");
  });

  it("allows a staff account that has not enrolled", () => {
    expect(
      decidePasswordAccess({ account: staffAccount, hasVerifiedFactor: false }),
    ).toBe("allowed");
  });
});

describe("checkNewPassword", () => {
  it("returns mismatch when the two values differ", () => {
    expect(checkNewPassword("one-password", "other-password")).toBe("mismatch");
  });

  it("returns null when the two values match", () => {
    expect(checkNewPassword("same-password", "same-password")).toBeNull();
    expect(checkNewPassword("", "")).toBeNull();
  });
});
