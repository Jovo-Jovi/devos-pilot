import { createHmac } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DeleteObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";
import sharp from "sharp";
import bookTypesJson from "../firebase/seed/book_types.json" with { type: "json" };
import ar from "../src/i18n/messages/ar.json" with { type: "json" };
import en from "../src/i18n/messages/en.json" with { type: "json" };

const PASSWORD = "synthetic-covers-password";
const BASE_URL = "http://127.0.0.1:3200";
const ACCEPT = "image/jpeg,image/png,image/webp";
const runId = Date.now().toString(36);
const email = `covers-${runId}@example.com`;

let userId = "";
let context: BrowserContext | undefined;
let page: Page;

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

type Catalogue = typeof ar;
type SeedBookType = { id: string; nameAr: string; nameEn: string; sortOrder: number };

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

function filled(template: string): string {
  return template.replaceAll("{formats}", "JPEG, PNG, WebP").replaceAll("{limit}", "5 MB");
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

function isRateLimited(error: { status?: number; code?: string } | null): boolean {
  return error?.status === 429 || error?.code === "over_request_rate_limit";
}

async function createEditor(): Promise<void> {
  const admin = adminClient();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const created = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      app_metadata: { staff: true },
    });
    if (!created.error && created.data.user) {
      userId = created.data.user.id;
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

async function poetryKeys(): Promise<string[]> {
  const listed = await bucketClient().send(
    new ListObjectsV2Command({
      Bucket: required("R2_BUCKET"),
      Prefix: "book-types/poetry/",
    }),
  );
  return (listed.Contents ?? []).flatMap((object) => (object.Key ? [object.Key] : []));
}

async function poetryRow(): Promise<string | null> {
  const found = await adminClient()
    .from("book_type_covers")
    .select("object_key")
    .eq("book_type_id", "poetry")
    .maybeSingle();
  if (found.error) throw new Error(found.error.code ?? "read cover failed");
  return found.data?.object_key ?? null;
}

async function deletePoetryObjects(): Promise<void> {
  const client = bucketClient();
  const bucket = required("R2_BUCKET");
  let token: string | undefined;
  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: "book-types/poetry/",
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

async function raster(kind: "png" | "jpeg"): Promise<Buffer> {
  const image = sharp({
    create: { width: 48, height: 64, channels: 3, background: { r: 40, g: 80, b: 120 } },
  });
  return kind === "png" ? image.png().toBuffer() : image.jpeg().toBuffer();
}

async function saveShot(width: number, name: string): Promise<void> {
  const current = staffPage();
  await current.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  await current.evaluate(() => document.fonts.ready);
  const path = join(process.cwd(), `.devos/screens/${name}.png`);
  mkdirSync(dirname(path), { recursive: true });
  await current.screenshot({ path, fullPage: true });
  if (width === 390) {
    expect(await current.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
}

test.describe.configure({ mode: "serial", timeout: 480_000 });

test.beforeAll(async ({ browser }) => {
  await createEditor();
  context = await browser.newContext({ baseURL: BASE_URL });
  page = await context.newPage();
});

test.afterAll(async () => {
  try {
    const admin = adminClient();
    const removed = await admin.from("book_type_covers").delete().eq("book_type_id", "poetry");
    if (removed.error) throw new Error(removed.error.code ?? "delete cover failed");
    await deletePoetryObjects();
    if (userId) {
      const deleted = await admin.auth.admin.deleteUser(userId);
      if (deleted.error) throw new Error(deleted.error.code ?? "delete user failed");
    }
  } finally {
    await context?.close();
  }
});

test("anonymous visitors and an AAL1 action are refused", async ({ browser }) => {
  const current = staffPage();
  await current.goto("/ar/staff/book-types");
  await expect(current).toHaveURL(/\/ar\/staff\/sign-in$/);

  await current.getByLabel(ar.staff.emailLabel).locator("visible=true").fill(email);
  await current.getByLabel(ar.staff.passwordLabel).locator("visible=true").fill(PASSWORD);
  await current.getByRole("button", { name: ar.staff.signInSubmit }).locator("visible=true").click();
  await expect(current).toHaveURL(/\/ar\/staff\/mfa$/);
  await current.goto("/ar/staff/book-types");
  await expect(current).toHaveURL(/\/ar\/staff\/mfa$/);

  const secret = (
    await current.locator("#staff-totp-secret").locator("visible=true").locator("bdi").innerText()
  ).trim();
  expect(secret.length).toBeGreaterThan(10);
  await current.locator("#staff-code").locator("visible=true").fill(await currentTotp(secret));
  await current.locator("form button[type='submit']").locator("visible=true").click();
  await expect(current).toHaveURL(/\/ar\/staff$/);
  await expect(current.getByRole("link", { name: ar.staff.bookTypesLink })).toHaveAttribute(
    "href",
    "/ar/staff/book-types",
  );

  await current.goto("/ar/staff/book-types");
  const poetry = bookTypeEntry(current, "الشعر");
  await expect(poetry.getByRole("button", { name: ar.staff.coverUpload })).toBeVisible();
  await poetry.locator("#staff-cover-poetry").setInputFiles({
    name: "cover.png",
    mimeType: "image/png",
    buffer: await raster("png"),
  });
  const saved = await current.context().cookies();

  const second = await browser.newContext({ baseURL: BASE_URL });
  try {
    const secondPage = await second.newPage();
    await secondPage.goto("/ar/staff/sign-in");
    await secondPage.getByLabel(ar.staff.emailLabel).locator("visible=true").fill(email);
    await secondPage.getByLabel(ar.staff.passwordLabel).locator("visible=true").fill(PASSWORD);
    await secondPage.getByRole("button", { name: ar.staff.signInSubmit }).locator("visible=true").click();
    await expect(secondPage).toHaveURL(/\/ar\/staff\/mfa$/);
    const aal1 = await second.cookies();
    await current.context().clearCookies();
    await current.context().addCookies(aal1);
  } finally {
    await second.close();
  }

  await poetry.getByRole("button", { name: ar.staff.coverUpload }).click({ timeout: 15_000 });
  await expect(current).toHaveURL(/\/ar\/staff\/mfa$/);
  expect(await poetryRow()).toBeNull();
  expect(await poetryKeys()).toEqual([]);

  await current.context().clearCookies();
  await current.context().addCookies(saved);
});

test("both locales list every book type with its cover or the placeholder", async () => {
  const current = staffPage();
  for (const locale of ["ar", "en"] as const) {
    const messages: Catalogue = locale === "ar" ? ar : en;
    await current.goto(`/${locale}/staff/book-types`);
    await expect(current.getByRole("heading", { level: 1, name: messages.staff.bookTypesTitle })).toBeVisible();
    const entries = current.locator("li.book-type");
    await expect(entries).toHaveCount(5);
    await expect(current.locator("ol.book-types .cover")).toHaveCount(5);
    const images = current.locator("ol.book-types img");
    await expect(images).toHaveCount(1);
    for (const [index, row] of bookTypes.entries()) {
      const name = locale === "ar" ? row.nameAr : row.nameEn;
      const entry = entries.nth(index);
      await expect(entry.locator("h2")).toHaveText(name);
      await expect(entry.locator("input[type=file]")).toHaveAttribute("accept", ACCEPT);
      await expect(entry.locator(`#staff-cover-${row.id}-hint`)).toHaveText(filled(messages.staff.coverHint));
      if (row.id === "novels") {
        await expect(entry.locator("img")).toHaveCount(1);
        await expectLoaded(entry.locator("img"));
        await expect(entry.getByRole("button", { name: messages.staff.coverReplace })).toBeVisible();
        await expect(entry.getByRole("button", { name: messages.staff.coverRemove })).toBeVisible();
        await expect(entry.getByRole("button", { name: messages.staff.coverUpload })).toHaveCount(0);
      } else {
        await expect(entry.locator("img")).toHaveCount(0);
        await expect(entry.getByRole("button", { name: messages.staff.coverUpload })).toBeVisible();
        await expect(entry.getByRole("button", { name: messages.staff.coverRemove })).toHaveCount(0);
      }
    }
  }
});

test("upload, replace and remove a poetry cover", async () => {
  const current = staffPage();
  await current.goto("/ar/staff/book-types");
  const poetry = bookTypeEntry(current, "الشعر");
  const base = publicBase();

  await poetry.locator("#staff-cover-poetry").setInputFiles({
    name: "cover.png",
    mimeType: "image/png",
    buffer: await raster("png"),
  });
  await poetry.getByRole("button", { name: ar.staff.coverUpload }).click();
  await expect(current).toHaveURL(/\/ar\/staff\/book-types\?done=saved$/);
  await expect(current.getByRole("status")).toHaveText(ar.staff.coverSaved);
  const uploaded = poetry.locator("img");
  await expect(uploaded).toHaveCount(1);
  await expectLoaded(uploaded);
  const firstSrc = await uploaded.getAttribute("src");
  expect(firstSrc?.startsWith(`${base}/book-types/poetry/`)).toBe(true);
  expect(firstSrc?.endsWith(".webp")).toBe(true);
  const firstKey = (firstSrc ?? "").slice(base.length + 1);
  expect(await poetryRow()).toBe(firstKey);
  const firstGet = await fetch(firstSrc ?? "");
  expect(firstGet.status).toBe(200);
  expect(firstGet.headers.get("content-type")).toBe("image/webp");

  await poetry.locator("#staff-cover-poetry").setInputFiles({
    name: "cover.jpg",
    mimeType: "image/jpeg",
    buffer: await raster("jpeg"),
  });
  await poetry.getByRole("button", { name: ar.staff.coverReplace }).click();
  const replaced = poetry.locator("img");
  await expect(replaced).not.toHaveAttribute("src", firstSrc ?? "", { timeout: 30_000 });
  await expect(current).toHaveURL(/\/ar\/staff\/book-types\?done=saved$/);
  await expectLoaded(replaced);
  const secondSrc = await replaced.getAttribute("src");
  expect(secondSrc).not.toBe(firstSrc);
  expect(secondSrc?.startsWith(`${base}/book-types/poetry/`)).toBe(true);
  const stale = await fetch(firstSrc ?? "");
  expect(stale.status).not.toBe(200);

  await poetry.getByRole("button", { name: ar.staff.coverRemove }).click();
  await expect(current).toHaveURL(/\/ar\/staff\/book-types\?done=removed$/);
  await expect(current.getByRole("status")).toHaveText(ar.staff.coverRemoved);
  await expect(poetry.locator("img")).toHaveCount(0);
  await expect(poetry.locator(".cover")).toHaveCount(1);
  await expect(poetry.getByRole("button", { name: ar.staff.coverUpload })).toBeVisible();
  await expect(poetry.getByRole("button", { name: ar.staff.coverRemove })).toHaveCount(0);
  expect(await poetryRow()).toBeNull();
  const gone = await fetch(secondSrc ?? "");
  expect(gone.status).not.toBe(200);
});

test("a 6 MB file and a GIF are refused in both locales", async () => {
  const current = staffPage();
  const tooLarge = Buffer.alloc(6_291_456);
  tooLarge[0] = 0xff;
  tooLarge[1] = 0xd8;
  tooLarge[2] = 0xff;
  const gif = await sharp({
    create: { width: 8, height: 8, channels: 3, background: { r: 255, g: 0, b: 0 } },
  })
    .gif()
    .toBuffer();
  for (const locale of ["ar", "en"] as const) {
    const messages: Catalogue = locale === "ar" ? ar : en;
    await current.goto(`/${locale}/staff/book-types`);
    const poetry = bookTypeEntry(current, locale === "ar" ? "الشعر" : "Poetry");
    await poetry.locator("#staff-cover-poetry").setInputFiles({
      name: "large.jpg",
      mimeType: "image/jpeg",
      buffer: tooLarge,
    });
    await poetry.getByRole("button", { name: messages.staff.coverUpload }).click();
    await expect(current.locator("#staff-cover-poetry-error")).toHaveText(filled(messages.staff.coverTooLarge), {
      timeout: 30_000,
    });
    expect(current.url()).not.toContain("done=");
    expect(await poetryRow()).toBeNull();

    await poetry.locator("#staff-cover-poetry").setInputFiles({
      name: "cover.gif",
      mimeType: "image/gif",
      buffer: gif,
    });
    await poetry.getByRole("button", { name: messages.staff.coverUpload }).click();
    await expect(current.locator("#staff-cover-poetry-error")).toHaveText(filled(messages.staff.coverWrongType));
    expect(current.url()).not.toContain("done=");
    expect(await poetryRow()).toBeNull();
  }
});

test("staff book-types screenshots in both locales", async () => {
  const current = staffPage();
  await current.setViewportSize({ width: 1280, height: 900 });
  await current.goto("/ar/staff/book-types");
  await expect(current.getByRole("heading", { level: 1, name: ar.staff.bookTypesTitle })).toBeVisible();
  const novelsAr = bookTypeEntry(current, "الروايات");
  await expectLoaded(novelsAr.locator("img"));
  await saveShot(1280, "ar-staff-book-types-desktop");
  await saveShot(390, "ar-staff-book-types-phone");

  await current.setViewportSize({ width: 1280, height: 900 });
  await current.getByRole("link", { name: ar.nav.switchTo }).click();
  await expect(current).toHaveURL(/\/en\/staff\/book-types$/);
  await expect(current.locator("html")).toHaveAttribute("lang", "en");
  await expect(current.getByRole("heading", { level: 1, name: en.staff.bookTypesTitle })).toBeVisible();
  const novelsEn = bookTypeEntry(current, "Novels");
  await expectLoaded(novelsEn.locator("img"));
  await saveShot(1280, "en-staff-book-types-desktop");
  await saveShot(390, "en-staff-book-types-phone");
});
