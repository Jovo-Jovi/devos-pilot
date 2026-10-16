import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
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

export default async function globalTeardown(): Promise<void> {
  required("R2_ENDPOINT");
  const secretKey = required("SUPABASE_SECRET_KEY");
  const supabase = createClient<Database>(required("NEXT_PUBLIC_SUPABASE_URL"), secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("book_type_covers")
    .select("object_key")
    .eq("book_type_id", "novels")
    .maybeSingle();
  if (error) throw new Error(`public.book_type_covers: ${error.message}`);
  if (!data) return;
  const { error: deleteError } = await supabase
    .from("book_type_covers")
    .delete()
    .eq("book_type_id", "novels");
  if (deleteError) throw new Error(`public.book_type_covers: ${deleteError.message}`);
  try {
    await bucketClient().send(
      new DeleteObjectCommand({
        Bucket: required("R2_BUCKET"),
        Key: data.object_key,
      }),
    );
  } catch {
    // A missing object is already gone.
  }
}
