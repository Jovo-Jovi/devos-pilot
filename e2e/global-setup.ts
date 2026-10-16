import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import type { Database } from "../src/lib/supabase/database.types";

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    if (name === "R2_ENDPOINT" || name === "SUPABASE_SECRET_KEY") {
      throw new Error(`${name} is not set: run node scripts/devos/r2.mjs start`);
    }
    throw new Error(`${name} is not set`);
  }
  return value;
}

function bucketClient(): S3Client {
  return new S3Client({
    endpoint: required("R2_ENDPOINT"),
    region: "auto",
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    },
  });
}

export default async function globalSetup(): Promise<void> {
  required("R2_ENDPOINT");
  required("SUPABASE_SECRET_KEY");
  const bucket = required("R2_BUCKET");
  const objectKey = `book-types/novels/${randomUUID()}.webp`;
  const webp = await sharp({
    create: {
      width: 600,
      height: 800,
      channels: 3,
      background: { r: 36, g: 72, b: 112 },
    },
  })
    .webp()
    .toBuffer();
  const client = bucketClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: webp,
      ContentType: "image/webp",
    }),
  );
  const supabase = createClient<Database>(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await supabase.from("book_type_covers").upsert({
    book_type_id: "novels",
    object_key: objectKey,
  });
  if (error) {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
    } catch {
      // The link was not written. A leftover object is unused.
    }
    throw new Error(`public.book_type_covers: ${error.message}`);
  }
}
