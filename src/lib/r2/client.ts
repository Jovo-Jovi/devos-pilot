import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { r2Env } from "./env";

let client: S3Client | undefined;

/** One S3 client per process, pointed at the bucket named by the environment. */
export function r2Client(): S3Client {
  if (client) return client;
  const { endpoint, accessKeyId, secretAccessKey } = r2Env();
  client = new S3Client({
    endpoint,
    region: "auto",
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}
