import { createHmac } from "node:crypto";
import { DeleteObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import sharp from "sharp";
import bookTypesJson from "../firebase/seed/book_types.json" with { type: "json" };
import ar from "../src/i18n/messages/ar.json" with { type: "json" };
import en from "../src/i18n/messages/en.json" with { type: "json" };

const FLOW_PASSWORD = "synthetic-flow-password";
const SEEDED_PASSWORD = "synthetic-test-password";
const BASE_URL = "http://127.0.0.1:3200";
const SCIENCE_PROBE_KEY = "book-types/science/00000000-0000-4000-8000-000000000000.webp";
const NOVELS_PROBE_KEY = "book-types/novels/00000000-0000-4000-8000-000000000000.webp";
const runId = Date.now().toString(36);
const email = `flow-${runId}@example.com`;

let accountId = "";
let context: BrowserContext | undefined;
let page: Page;
let firstCoverSrc = "";
let secondCoverSrc = "";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

type Catalogue = typeof ar;
type SeedBookType = { id: string; nameAr: string; nameEn: string; sortOrder: number };
type AuthFailure = { status?: number; code?: string } | null;
type CoverLink = { book_type_id: string; object_key: string };

const bookTypes = (bookTypesJson as SeedBookType[]).slice().sort((left, right) => {
  if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
});

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") throw new Error(`${name} is not set`);
  return value;
}

function publicBase(): string {
  return required("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
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

function decodeBase32(input: string): Buffer {
  const cleaned = input.replace(/=+$/u, "").replace(/\s/gu, "").toUpperCase();
  let bits = "";
  for (const char of cleaned) {
    const value = alphabet.indexOf(char);
    if (value < 0) throw new Error("invalid base32");
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function totp(secret: string, at = Date.now()): string {
  const counter = Math.floor(at / 30_000);
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(counterBytes).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return (binary % 1_000_000).toString().padStart(6, "0");
}

async function currentTotp(secret: string): Promise<string> {
  const step = 30_000;
  const remaining = step - (Date.now() % step);
  if (remaining < 5_000) {
    await new Promise((resolve) => setTimeout(resolve, remaining + 250));
  }
  return totp(secret);
}

function adminClient() {
  return createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function publishableClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("supabase public env is not set");
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function isRateLimited(error: AuthFailure): boolean {
  return error?.status === 429 || error?.code === "over_request_rate_limit";
}

async function pauseForRateLimit(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));
}

async function signInWithPassword(client: SupabaseClient, address: string): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const signedIn = await client.auth.signInWithPassword({
      email: address,
      password: SEEDED_PASSWORD,
    });
    if (!signedIn.error) return;
    if (isRateLimited(signedIn.error) && attempt === 0) {
      await pauseForRateLimit();
      continue;
    }
    throw new Error(signedIn.error.code ?? "sign-in failed");
  }
  throw new Error("sign-in failed");
}

function assertInsertRefused(error: unknown): void {
  expect(error).toBeTruthy();
}

function assertMutationRefused(error: unknown, returned: unknown): void {
  if (error) {
    expect(error).toBeTruthy();
    return;
  }
  expect(returned).toEqual([]);
}

function staffPage(): Page {
  if (!page) throw new Error("staff page is not open");
  return page;
}

function bookTypeEntry(current: Page, name: string): Locator {
  return current.locator("li.book-type").filter({
    has: current.getByRole("heading", { level: 2, name, exact: true }),
  });
}

async function expectLoaded(image: Locator): Promise<void> {
  await expect
    .poll(async () =>
      image.evaluate((node) => {
        const picture = node as HTMLImageElement;
        return picture.complete && picture.naturalWidth > 0;
      }),
    )
    .toBe(true);
}

async function withAnonymous(browser: Browser, run: (anonPage: Page) => Promise<void>): Promise<void> {
  const anon = await browser.newContext({ baseURL: BASE_URL });
  const anonPage = await anon.newPage();
  try {
    await run(anonPage);
  } finally {
    await anon.close();
  }
}

function objectKeyFromSrc(src: string): string {
  const base = publicBase();
  if (!src.startsWith(`${base}/`)) throw new Error("cover url is outside the public base");
  return src.slice(base.length + 1);
}

async function scienceObjectKey(): Promise<string | null> {
  const found = await adminClient()
    .from("book_type_covers")
    .select("object_key")
    .eq("book_type_id", "science")
    .maybeSingle();
  if (found.error) throw new Error(found.error.code ?? "read cover failed");
  return found.data?.object_key ?? null;
}

async function novelsCoverLink(): Promise<CoverLink> {
  const found = await adminClient()
    .from("book_type_covers")
    .select("book_type_id, object_key")
    .eq("book_type_id", "novels")
    .single();
  if (found.error || !found.data) throw new Error(found.error?.code ?? "novels cover missing");
  return found.data;
}

async function scienceObjectKeys(): Promise<string[]> {
  const client = bucketClient();
  const bucket = required("R2_BUCKET");
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: "book-types/science/",
        ContinuationToken: token,
      }),
    );
    for (const object of listed.Contents ?? []) {
      if (object.Key) keys.push(object.Key);
    }
    token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function deleteScienceObjects(): Promise<void> {
  const client = bucketClient();
  const bucket = required("R2_BUCKET");
  let token: string | undefined;
  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: "book-types/science/",
        ContinuationToken: token,
      }),
    );
    for (const object of listed.Contents ?? []) {
      if (!object.Key) continue;
      try {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: object.Key }));
      } catch {
        // A missing object is already gone.
      }
    }
    token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (token);
}

async function createEditor(): Promise<void> {
  const admin = adminClient();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const created = await admin.auth.admin.createUser({
      email,
      password: FLOW_PASSWORD,
      email_confirm: true,
      app_metadata: { staff: true },
    });
    if (!created.error && created.data.user) {
      accountId = created.data.user.id;
      return;
    }
    if (isRateLimited(created.error) && attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));
      continue;
    }
    throw new Error(created.error?.code ?? "create failed");
  }
  throw new Error("create failed");
}

function scriptSources(html: string): string[] {
  const sources: string[] = [];
  const pattern = /<script\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  for (const match of html.matchAll(pattern)) {
    sources.push(match[1] ?? match[2] ?? "");
  }
  return sources;
}

test.describe.configure({ mode: "serial", timeout: 480_000 });

test.beforeAll(async ({ browser }) => {
  await createEditor();
  context = await browser.newContext({ baseURL: BASE_URL });
  page = await context.newPage();
});

test.afterAll(async () => {
  const failures: string[] = [];
  try {
    const admin = adminClient();
    const removed = await admin.from("book_type_covers").delete().eq("book_type_id", "science");
    if (removed.error) failures.push(removed.error.code ?? "delete cover failed");
    try {
      await deleteScienceObjects();
    } catch {
      failures.push("delete objects failed");
    }
    if (accountId) {
      const deleted = await admin.auth.admin.deleteUser(accountId);
      if (deleted.error) failures.push(deleted.error.code ?? "delete account failed");
    }
    if (failures.length > 0) throw new Error(failures.join("; "));
  } finally {
    await context?.close();
  }
});

test("seeded book types in both locales", async ({ browser }) => {
  await withAnonymous(browser, async (anonPage) => {
    for (const locale of ["ar", "en"] as const) {
      const messages: Catalogue = locale === "ar" ? ar : en;
      await anonPage.goto(`/${locale}/book-types`);
      await expect(anonPage.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      const entries = anonPage.locator("li.book-type");
      await expect(entries).toHaveCount(5);
      for (const [index, row] of bookTypes.entries()) {
        const name = locale === "ar" ? row.nameAr : row.nameEn;
        await expect(entries.nth(index).locator("h2")).toHaveText(name);
      }
      await expect(anonPage.locator(".cover")).toHaveCount(5);
      await expect(anonPage.locator("ol.book-types img")).toHaveCount(1);
      const novelsName = locale === "ar" ? "الروايات" : "Novels";
      await expect(bookTypeEntry(anonPage, novelsName).locator("img")).toHaveCount(1);

      await anonPage.goto(`/${locale}`);
      await expect(
        anonPage.getByRole("link", { name: messages.link.bookTypes, exact: true }),
      ).toHaveAttribute("href", `/${locale}/book-types`);
    }
  });
});

test("upload shows a WebP cover without EXIF on the public page", async ({ browser }) => {
  const jpeg = await sharp({
    create: { width: 2400, height: 1600, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .jpeg()
    .withMetadata({ orientation: 6, exif: { IFD0: { Copyright: "devos-test" } } })
    .toBuffer();
  const control = await sharp(jpeg).metadata();
  expect(control.exif).toBeDefined();

  const current = staffPage();
  await current.goto("/ar/staff");
  await expect(current).toHaveURL(/\/ar\/staff\/sign-in$/);
  await current.getByLabel(ar.staff.emailLabel).locator("visible=true").fill(email);
  await current.getByLabel(ar.staff.passwordLabel).locator("visible=true").fill(FLOW_PASSWORD);
  await current.getByRole("button", { name: ar.staff.signInSubmit }).locator("visible=true").click();
  await expect(current).toHaveURL(/\/ar\/staff\/mfa$/);
  const secret = (
    await current.locator("#staff-totp-secret").locator("visible=true").locator("bdi").innerText()
  ).trim();
  expect(secret.length).toBeGreaterThan(10);
  await current.locator("#staff-code").locator("visible=true").fill(await currentTotp(secret));
  await current.locator("form button[type='submit']").locator("visible=true").click();
  await expect(current).toHaveURL(/\/ar\/staff$/);
  await current.getByRole("link", { name: ar.staff.bookTypesLink }).click();
  await expect(current).toHaveURL(/\/ar\/staff\/book-types$/);

  const science = bookTypeEntry(current, "العلوم");
  await science.locator("#staff-cover-science").setInputFiles({
    name: "cover.jpg",
    mimeType: "image/jpeg",
    buffer: jpeg,
  });
  await science.getByRole("button", { name: ar.staff.coverUpload }).click();
  await expect(current).toHaveURL(/\/ar\/staff\/book-types\?done=saved$/);

  const base = publicBase();
  await withAnonymous(browser, async (anonPage) => {
    for (const locale of ["ar", "en"] as const) {
      const name = locale === "ar" ? "العلوم" : "Science";
      await anonPage.goto(`/${locale}/book-types`);
      await expect(anonPage.locator("ol.book-types img")).toHaveCount(2);
      const image = bookTypeEntry(anonPage, name).locator("img");
      await expect(image).toHaveCount(1);
      await expect(image).toHaveAttribute("alt", "");
      await image.scrollIntoViewIfNeeded();
      await expectLoaded(image);
      const src = await image.getAttribute("src");
      expect(src?.startsWith(`${base}/book-types/science/`)).toBe(true);
      expect(src?.endsWith(".webp")).toBe(true);
      if (locale === "ar") firstCoverSrc = src ?? "";
      else expect(src).toBe(firstCoverSrc);
    }
  });

  const response = await fetch(firstCoverSrc);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/webp");
  const stored = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
  expect(stored.format).toBe("webp");
  expect(stored.width).toBe(1200);
  expect(stored.height).toBe(1800);
  expect(stored.exif).toBeUndefined();
  expect(stored.xmp).toBeUndefined();
  expect(stored.iptc).toBeUndefined();
  expect(stored.orientation).toBeUndefined();
  expect(await scienceObjectKey()).toBe(objectKeyFromSrc(firstCoverSrc));
});

test("replace shows a different cover on the public page", async ({ browser }) => {
  const png = await sharp({
    create: { width: 400, height: 300, channels: 3, background: { r: 200, g: 40, b: 40 } },
  })
    .png()
    .toBuffer();
  const current = staffPage();
  await current.goto("/en/staff/book-types");
  const science = bookTypeEntry(current, "Science");
  await science.locator("#staff-cover-science").setInputFiles({
    name: "cover.png",
    mimeType: "image/png",
    buffer: png,
  });
  await science.getByRole("button", { name: en.staff.coverReplace }).click();
  await expect(current).toHaveURL(/\/en\/staff\/book-types\?done=saved$/);

  const base = publicBase();
  await withAnonymous(browser, async (anonPage) => {
    for (const locale of ["ar", "en"] as const) {
      const name = locale === "ar" ? "العلوم" : "Science";
      await anonPage.goto(`/${locale}/book-types`);
      const image = bookTypeEntry(anonPage, name).locator("img");
      await expect(image).toHaveCount(1);
      await image.scrollIntoViewIfNeeded();
      await expectLoaded(image);
      const src = await image.getAttribute("src");
      expect(src).not.toBe(firstCoverSrc);
      expect(src?.startsWith(`${base}/book-types/science/`)).toBe(true);
      expect(src?.endsWith(".webp")).toBe(true);
      if (locale === "ar") secondCoverSrc = src ?? "";
      else expect(src).toBe(secondCoverSrc);
    }
  });

  const stale = await fetch(firstCoverSrc);
  expect(stale.status).not.toBe(200);
  expect(await scienceObjectKey()).toBe(objectKeyFromSrc(secondCoverSrc));
});

test("remove restores the placeholder on the public page", async ({ browser }) => {
  const current = staffPage();
  await current.goto("/en/staff/book-types");
  const science = bookTypeEntry(current, "Science");
  await science.getByRole("button", { name: en.staff.coverRemove }).click();
  await expect(current).toHaveURL(/\/en\/staff\/book-types\?done=removed$/);

  await withAnonymous(browser, async (anonPage) => {
    for (const locale of ["ar", "en"] as const) {
      const name = locale === "ar" ? "العلوم" : "Science";
      await anonPage.goto(`/${locale}/book-types`);
      const entry = bookTypeEntry(anonPage, name);
      await expect(entry.locator("img")).toHaveCount(0);
      await expect(entry.locator(".cover")).toHaveCount(1);
      await expect(anonPage.locator("img")).toHaveCount(1);
    }
  });

  const gone = await fetch(secondCoverSrc);
  expect(gone.status).not.toBe(200);
  expect(await scienceObjectKey()).toBeNull();
  expect(await scienceObjectKeys()).toEqual([]);
});

test("REST writes without the staff claim at AAL2 are refused", async () => {
  const beforeNovels = await novelsCoverLink();
  const principals: (string | null)[] = [null, "visitor-account@example.com", "staff-totp@example.com"];
  for (const address of principals) {
    const client = publishableClient();
    try {
      if (address) await signInWithPassword(client, address);
      const inserted = await client.from("book_type_covers").insert({
        book_type_id: "science",
        object_key: SCIENCE_PROBE_KEY,
      });
      assertInsertRefused(inserted.error);
      const updated = await client
        .from("book_type_covers")
        .update({ object_key: NOVELS_PROBE_KEY })
        .eq("book_type_id", "novels")
        .select("book_type_id");
      assertMutationRefused(updated.error, updated.data);
      const removed = await client
        .from("book_type_covers")
        .delete()
        .eq("book_type_id", "novels")
        .select("book_type_id");
      assertMutationRefused(removed.error, removed.data);
    } finally {
      const signedOut = await client.auth.signOut();
      if (signedOut.error) throw new Error(signedOut.error.code ?? "sign-out failed");
    }
  }

  expect(await novelsCoverLink()).toEqual(beforeNovels);
  expect(await scienceObjectKey()).toBeNull();
});

test("public responses stay cookieless, formless and free of Firebase", async ({ request }) => {
  for (const path of ["/ar", "/en", "/ar/notices", "/en/notices", "/ar/book-types", "/en/book-types"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["set-cookie"]).toBeUndefined();
    const policy = response.headers()["content-security-policy"] ?? "";
    expect(policy).toContain("form-action 'none'");
    expect(policy).toContain("connect-src 'self'");
    const html = await response.text();
    expect(html.includes("<form")).toBe(false);
    expect(html.includes("<input")).toBe(false);
    expect(html.includes("<textarea")).toBe(false);
    expect(html.includes("<select")).toBe(false);
    expect(html).not.toMatch(/firebase|firestore/i);
    const origin = new URL(response.url()).origin;
    const sources = scriptSources(html);
    expect(sources.length).toBeGreaterThan(0);
    for (const src of sources) {
      expect(src).not.toBe("");
      expect(new URL(src, origin).origin).toBe(origin);
    }
  }
});
