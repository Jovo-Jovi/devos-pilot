vi.mock("server-only", () => ({}));

import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { COVER_MAX_BYTES, coverObjectKey, detectCoverImageType, prepareCoverImage } from "./cover-image";
import { COVER_KEY_PATTERN } from "./objects";

describe("cover images", () => {
  it("recognises JPEG, PNG and WebP by their first bytes", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const webp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(detectCoverImageType(jpeg)).toBe("jpeg");
    expect(detectCoverImageType(png)).toBe("png");
    expect(detectCoverImageType(webp)).toBe("webp");
  });

  it("rejects a GIF, a WAVE file, a short JPEG prefix and an empty buffer", () => {
    const gif = new TextEncoder().encode("GIF89a");
    const wave = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
    ]);
    expect(detectCoverImageType(gif)).toBeNull();
    expect(detectCoverImageType(wave)).toBeNull();
    expect(detectCoverImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(detectCoverImageType(new Uint8Array())).toBeNull();
  });

  it("refuses a buffer larger than 5 MB", async () => {
    expect(COVER_MAX_BYTES).toBe(5242880);
    const bytes = new Uint8Array(COVER_MAX_BYTES + 1);
    bytes[0] = 0xff;
    bytes[1] = 0xd8;
    bytes[2] = 0xff;
    await expect(prepareCoverImage(bytes)).resolves.toEqual({ ok: false, refusal: "tooLarge" });
  });

  it("refuses a GIF made with sharp", async () => {
    const gif = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .gif()
      .toBuffer();
    await expect(prepareCoverImage(gif)).resolves.toEqual({ ok: false, refusal: "wrongType" });
  });

  it("refuses JPEG bytes that do not decode", async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x11, 0x22]);
    await expect(prepareCoverImage(bytes)).resolves.toEqual({ ok: false, refusal: "wrongType" });
  });

  it("builds a cover key that matches the object key pattern", () => {
    const first = coverObjectKey("novels");
    const second = coverObjectKey("novels");
    expect(first).toMatch(COVER_KEY_PATTERN);
    expect(first.startsWith("book-types/novels/")).toBe(true);
    expect(second).not.toBe(first);
  });

  it("rejects a book type id that is not kebab-case", () => {
    expect(() => coverObjectKey("Novels")).toThrow(new Error("invalid book type id"));
    expect(() => coverObjectKey("../novels")).toThrow(new Error("invalid book type id"));
    expect(() => coverObjectKey("")).toThrow(new Error("invalid book type id"));
  });
});
