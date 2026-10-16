import "server-only";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") throw new Error(`${name} is not set`);
  return value;
}

/** Public base with any trailing slash removed. Reads only `R2_PUBLIC_BASE_URL`. */
export function r2PublicBaseUrl(): string {
  return requiredEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
}

/** The five storage names. Never logs a value. */
export function r2Env(): {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
} {
  return {
    endpoint: requiredEnv("R2_ENDPOINT"),
    accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
    bucket: requiredEnv("R2_BUCKET"),
    publicBaseUrl: r2PublicBaseUrl(),
  };
}
