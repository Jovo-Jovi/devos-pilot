vi.mock("server-only", () => ({}));

import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { coverObjectKey, prepareCoverImage } from "./cover-image";
import { coverPublicUrl, deleteCoverObject, putCoverObject } from "./objects";

let storedKey: string | undefined;

beforeAll(() => {
  if (!process.env.R2_ENDPOINT) {
    throw new Error("R2_ENDPOINT is not set: run node scripts/devos/r2.mjs start");
  }
});

afterAll(async () => {
  if (!storedKey) return;
  try {
    await deleteCoverObject(storedKey);
  } catch {
    // The object may already have been deleted.
  }
});

describe("cover storage", () => {
  it("re-encodes an oriented JPEG to WebP at 1200 px with metadata removed", async () => {
    const jpeg = await sharp({
      create: { width: 2400, height: 1600, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .jpeg()
      .withMetadata({ orientation: 6, exif: { IFD0: { Copyright: "devos-test" } } })
      .toBuffer();

    const control = await sharp(jpeg).metadata();
    expect(control.exif).toBeDefined();
    expect(control.orientation).toBe(6);

    const prepared = await prepareCoverImage(jpeg);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) throw new Error("expected a prepared cover");

    const stored = await sharp(prepared.webp).metadata();
    expect(stored.format).toBe("webp");
    expect(prepared.width).toBe(1200);
    expect(prepared.height).toBe(1800);
    expect(stored.width).toBe(1200);
    expect(stored.height).toBe(1800);
    expect(stored.exif).toBeUndefined();
    expect(stored.xmp).toBeUndefined();
    expect(stored.iptc).toBeUndefined();
    expect(stored.icc).toBeUndefined();
    expect(stored.orientation).toBeUndefined();
  });

  it("does not enlarge a PNG that is already narrower than 1200 px", async () => {
    const png = await sharp({
      create: { width: 400, height: 300, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .png()
      .toBuffer();
    const prepared = await prepareCoverImage(png);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) throw new Error("expected a prepared cover");
    expect(prepared.width).toBe(400);
    const stored = await sharp(prepared.webp).metadata();
    expect(stored.width).toBe(400);
  });

  it("puts a cover, reads it from the public URL and deletes it", async () => {
    const png = await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 9, g: 8, b: 7 } },
    })
      .png()
      .toBuffer();
    const prepared = await prepareCoverImage(png);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) throw new Error("expected a prepared cover");

    storedKey = coverObjectKey("storage-test");
    await putCoverObject(storedKey, prepared.webp);

    const url = coverPublicUrl(storedKey);
    const response = await fetch(url);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    const body = new Uint8Array(await response.arrayBuffer());
    const stored = await sharp(body).metadata();
    expect(stored.format).toBe("webp");
    expect(stored.width).toBeLessThanOrEqual(1200);
    expect(stored.exif).toBeUndefined();

    await deleteCoverObject(storedKey);
    const after = await fetch(url);
    expect(after.status).not.toBe(200);
  });
});
