import "server-only";
import { DeleteObjectCommand, PutObjectCommand, type PutObjectCommandInput } from "@aws-sdk/client-s3";
import { r2Client } from "./client";
import { r2Env, r2PublicBaseUrl } from "./env";

/** `object_key` from `docs/DATA_MODEL.md` §10, character for character. */
export const COVER_KEY_PATTERN =
  /^book-types\/[a-z0-9]+(-[a-z0-9]+)*\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

function assertCoverKey(key: string): void {
  if (!COVER_KEY_PATTERN.test(key)) throw new Error("invalid cover key");
}

export function coverPutInput(bucket: string, key: string, body: Uint8Array): PutObjectCommandInput {
  assertCoverKey(key);
  return {
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: "image/webp",
    CacheControl: `public, max-age=${60 * 60 * 24 * 365}, immutable`,
  };
}

export async function putCoverObject(key: string, webp: Uint8Array): Promise<void> {
  const { bucket } = r2Env();
  await r2Client().send(new PutObjectCommand(coverPutInput(bucket, key, webp)));
}

export async function deleteCoverObject(key: string): Promise<void> {
  assertCoverKey(key);
  const { bucket } = r2Env();
  await r2Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export function coverPublicUrl(key: string): string {
  return `${r2PublicBaseUrl()}/${key}`;
}
