import { describe, expect, it } from "vitest";
import { templateParts } from "./template";

describe("template", () => {
  it("splits a token from the text around it and skips an empty text part", () => {
    expect(templateParts("Open now, until {time}")).toEqual([
      { kind: "text", text: "Open now, until " },
      { kind: "token", name: "time" },
    ]);
    expect(templateParts("{day}:")).toEqual([
      { kind: "token", name: "day" },
      { kind: "text", text: ":" },
    ]);
    expect(templateParts("no tokens")).toEqual([{ kind: "text", text: "no tokens" }]);
  });

  it("keeps a single-letter token and adjacent tokens, and returns nothing for an empty template", () => {
    expect(templateParts("{a} and {day}{time}")).toEqual([
      { kind: "token", name: "a" },
      { kind: "text", text: " and " },
      { kind: "token", name: "day" },
      { kind: "token", name: "time" },
    ]);
    expect(templateParts("")).toEqual([]);
  });
});
