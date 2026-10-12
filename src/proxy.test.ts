import { describe, expect, it } from "vitest";
import { config } from "./proxy";

describe("staff session proxy", () => {
  it("matches only the staff routes", () => {
    expect(config.matcher).toEqual(["/(ar|en)/staff/:path*"]);
  });
});
