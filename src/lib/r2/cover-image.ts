import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export const COVER_MAX_WIDTH = 1200;

export type CoverImageType = "jpeg" | "png" | "webp";
export type CoverRefusal = "tooLarge" | "wrongType";

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46] as const;
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50] as const;

const BOOK_TYPE_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function matchesAt(bytes: Uint8Array, offset: number, signature: readonly number[]): boolean {
  if (bytes.length < offset + signature.length) return false;
  for (let index = 0; index < signature.length; index += 1) {
    if (bytes[offset + index] !== signature[index]) return false;
  }
  return true;
}

/** JPEG, PNG or WebP from the first bytes only. Anything else is null. */
export function detectCoverImageType(bytes: Uint8Array): CoverImageType | null {
  if (matchesAt(bytes, 0, JPEG_SIGNATURE)) return "jpeg";
  if (matchesAt(bytes, 0, PNG_SIGNATURE)) return "png";
  if (matchesAt(bytes, 0, RIFF_SIGNATURE) && matchesAt(bytes, 8, WEBP_SIGNATURE)) return "webp";
  return null;
}

export async function prepareCoverImage(
  bytes: Uint8Array,
): Promise<
  { ok: true; webp: Buffer; width: number; height: number } | { ok: false; refusal: CoverRefusal }
> {
  if (bytes.length > COVER_MAX_BYTES) return { ok: false, refusal: "tooLarge" };
  if (detectCoverImageType(bytes) === null) return { ok: false, refusal: "wrongType" };
  try {
    const webp = await sharp(bytes)
      .autoOrient()
      .resize({ width: COVER_MAX_WIDTH, withoutEnlargement: true })
      .webp()
      .toBuffer();
    const meta = await sharp(webp).metadata();
    return { ok: true, webp, width: meta.width, height: meta.height };
  } catch {
    return { ok: false, refusal: "wrongType" };
  }
}

export function coverObjectKey(bookTypeId: string): string {
  if (!BOOK_TYPE_ID_PATTERN.test(bookTypeId)) throw new Error("invalid book type id");
  return `book-types/${bookTypeId}/${randomUUID()}.webp`;
}
