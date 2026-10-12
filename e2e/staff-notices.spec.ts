import { createHmac } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import noticesJson from "../content/library-notices.json" with { type: "json" };
import ar from "../src/i18n/messages/ar.json" with { type: "json" };
import en from "../src/i18n/messages/en.json" with { type: "json" };

const PASSWORD = "synthetic-editor-password";
const BASE_URL = "http://127.0.0.1:3200";
const runId = Date.now().toString(36);
const email = `editor-${runId}@example.com`;
const titleAr = `مسودة المحرر ${runId}`;
const titleEn = `Editor draft ${runId}`;
const titleEnEdited = `Editor draft edited ${runId}`;
const bodyAr = "متن تجريبي لا يُعرض قبل النشر.";
const bodyEn = "Synthetic body hidden until it is published.";

const publishedOn = dayAfter(
  noticesJson.reduce(
    (latest, row) => (row.publishedOn > latest ? row.publishedOn : latest),
    "",
  ),
);

let userId = "";
let noticeId = "";
let context: BrowserContext | undefined;
let page: Page;

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function dayAfter(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + 1));
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, "0");
  const d = String(next.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new Error("supabase admin env is not set");
  return createClient(url, secretKey, {
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

async function saveShot(width: number, name: string): Promise<void> {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  await page.evaluate(() => document.fonts.ready);
  const path = join(process.cwd(), `.devos/screens/${name}.png`);
  mkdirSync(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
  if (width === 390) {
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
}

function staffPage(): Page {
  if (!page) throw new Error("staff page is not open");
  return page;
}

test.describe.configure({ mode: "serial", timeout: 180_000 });

test.beforeAll(async ({ browser }) => {
  await createEditor();
  context = await browser.newContext({ baseURL: BASE_URL });
  page = await context.newPage();
});

test.afterAll(async () => {
  try {
    const admin = adminClient();
    if (noticeId) {
      const drafted = await admin
        .from("library_notices")
        .update({ status: "draft" })
        .eq("id", noticeId);
      if (drafted.error) throw new Error(drafted.error.code ?? "draft failed");
      const removed = await admin.from("library_notices").delete().eq("id", noticeId);
      if (removed.error) throw new Error(removed.error.code ?? "delete failed");
    }
    if (userId) {
      const removed = await admin.auth.admin.deleteUser(userId);
      if (removed.error) throw new Error(removed.error.code ?? "delete user failed");
    }
  } finally {
    await context?.close();
  }
});

test("anonymous staff notices redirect to sign-in, and AAL1 is sent to the authenticator", async () => {
  const current = staffPage();
  for (const row of noticesJson) {
    expect(publishedOn > row.publishedOn).toBe(true);
  }
  await current.goto("/ar/staff/notices");
  await expect(current).toHaveURL(/\/ar\/staff\/sign-in$/);

  await current.getByLabel(ar.staff.emailLabel).locator("visible=true").fill(email);
  await current.getByLabel(ar.staff.passwordLabel).locator("visible=true").fill(PASSWORD);
  await current.getByRole("button", { name: ar.staff.signInSubmit }).locator("visible=true").click();
  await expect(current).toHaveURL(/\/ar\/staff\/mfa$/);
  await current.goto("/ar/staff/notices/new");
  await expect(current).toHaveURL(/\/ar\/staff\/mfa$/);

  const secret = (
    await current.locator("#staff-totp-secret").locator("visible=true").locator("bdi").innerText()
  ).trim();
  expect(secret.length).toBeGreaterThan(10);
  await current.locator("#staff-code").locator("visible=true").fill(await currentTotp(secret));
  await current.locator("form button[type='submit']").locator("visible=true").click();
  await expect(current).toHaveURL(/\/ar\/staff$/);
  await expect(current.getByRole("link", { name: ar.staff.noticesLink }).locator("visible=true")).toHaveAttribute(
    "href",
    "/ar/staff/notices",
  );
});

test("a blank notice is rejected, and a draft stays off the public pages", async () => {
  const current = staffPage();
  await current.goto("/ar/staff/notices/new");
  await expect(current.getByRole("heading", { level: 1, name: ar.staff.newNoticeTitle })).toBeVisible();
  await expect(current.locator("#staff-title-ar")).toHaveAttribute("dir", "rtl");
  await expect(current.locator("#staff-body-ar")).toHaveAttribute("dir", "rtl");
  await expect(current.locator("#staff-title-en")).toHaveAttribute("dir", "ltr");
  await expect(current.locator("#staff-body-en")).toHaveAttribute("dir", "ltr");
  await expect(current.locator("#staff-title-ar")).not.toHaveAttribute("lang", /.+/);
  await expect(current.locator("#staff-published-on")).toHaveAttribute("type", "date");
  await expect(current.locator("#staff-published-on").locator("xpath=ancestor::bdi[@dir='ltr']")).toHaveCount(1);

  await current.getByRole("button", { name: ar.staff.saveSubmit }).click();
  await expect(current).toHaveURL(/\/ar\/staff\/notices\/new$/);
  await expect(current.getByText(ar.staff.errorRequired).first()).toBeVisible();
  await expect(current.getByText(ar.staff.errorDate).first()).toBeVisible();

  await current.locator("#staff-published-on").fill(publishedOn);
  await current.locator("#staff-title-ar").fill(titleAr);
  await current.locator("#staff-title-en").fill(titleEn);
  await current.locator("#staff-body-ar").fill(bodyAr);
  await current.locator("#staff-body-en").fill(bodyEn);
  await current.getByRole("button", { name: ar.staff.saveSubmit }).click();
  await expect(current).toHaveURL(/\/ar\/staff\/notices\/[a-z0-9-]+\?done=saved$/);
  const saved = new URL(current.url());
  noticeId = saved.pathname.split("/").at(-1) ?? "";
  expect(noticeId).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  await expect(current.getByRole("status")).toHaveText(ar.staff.confirmSaved);
  await expect(current.getByRole("button", { name: ar.staff.publishSubmit })).toBeVisible();

  await current.goto("/ar/staff/notices");
  await expect(current.getByRole("link", { name: ar.staff.newNoticeTitle })).toHaveAttribute(
    "href",
    "/ar/staff/notices/new",
  );
  const entry = current.locator("li.notice", {
    has: current.getByRole("heading", { level: 2, name: titleAr }),
  });
  await expect(entry).toBeVisible();
  await expect(entry.getByRole("link", { name: ar.staff.editLink })).toHaveAttribute(
    "href",
    `/ar/staff/notices/${noticeId}`,
  );
  await expect(entry).toContainText(ar.staff.statusDraft);
  await expect(entry).not.toContainText(bodyAr);
  const seededDraft = noticesJson.find((row) => row.status === "draft");
  expect(seededDraft).toBeTruthy();
  await expect(
    current.getByRole("heading", { level: 2, name: seededDraft?.titleAr }),
  ).toBeVisible();

  await current.goto("/ar/notices");
  await expect(current.getByText(titleAr)).toHaveCount(0);
  await current.goto("/en/notices");
  await expect(current.getByText(titleEn)).toHaveCount(0);
  await current.goto("/ar");
  await expect(current.getByText(titleAr)).toHaveCount(0);
});

test("publishing shows the notice, and an English edit shows on the English page", async () => {
  const current = staffPage();
  await current.goto(`/ar/staff/notices/${noticeId}`);
  await current.getByRole("button", { name: ar.staff.publishSubmit }).click();
  await expect(current).toHaveURL(new RegExp(`/ar/staff/notices/${noticeId}\\?done=published$`));
  await expect(current.getByRole("status")).toHaveText(ar.staff.confirmPublished);
  await expect(current.getByRole("button", { name: ar.staff.unpublishSubmit })).toBeVisible();

  await current.goto("/ar/notices");
  await expect(current.getByRole("heading", { level: 2, name: titleAr })).toBeVisible();
  await current.goto("/en/notices");
  await expect(current.getByRole("heading", { level: 2, name: titleEn })).toBeVisible();
  await current.goto("/ar");
  await expect(current.locator("li.notice")).toHaveCount(3);
  await expect(current.getByRole("heading", { level: 3, name: titleAr })).toBeVisible();

  await current.goto(`/ar/staff/notices/${noticeId}`);
  await current.locator("#staff-title-en").fill(titleEnEdited);
  await current.getByRole("button", { name: ar.staff.saveSubmit }).click();
  await expect(current).toHaveURL(new RegExp(`/ar/staff/notices/${noticeId}\\?done=saved$`));
  await current.goto("/en/notices");
  await expect(current.getByRole("heading", { level: 2, name: titleEnEdited })).toBeVisible();
  await expect(current.getByRole("heading", { level: 2, name: titleEn })).toHaveCount(0);
  await current.goto("/ar/notices");
  await expect(current.getByRole("heading", { level: 2, name: titleAr })).toBeVisible();
});

test("unpublishing removes the notice from the public pages", async () => {
  const current = staffPage();
  await current.goto(`/ar/staff/notices/${noticeId}`);
  await current.getByRole("button", { name: ar.staff.unpublishSubmit }).click();
  await expect(current).toHaveURL(new RegExp(`/ar/staff/notices/${noticeId}\\?done=unpublished$`));
  await expect(current.getByRole("status")).toHaveText(ar.staff.confirmUnpublished);

  await current.goto("/ar/notices");
  await expect(current.getByText(titleAr)).toHaveCount(0);
  await current.goto("/en/notices");
  await expect(current.getByText(titleEnEdited)).toHaveCount(0);
  await current.goto("/ar");
  await expect(current.getByText(titleAr)).toHaveCount(0);
});

test("staff notice screenshots in both locales", async () => {
  const current = staffPage();
  await current.setViewportSize({ width: 1280, height: 900 });
  await current.goto("/ar/staff/notices");
  await expect(current.getByRole("heading", { level: 1, name: ar.staff.noticesTitle })).toBeVisible();
  await expect(current.locator("ol.notices li.notice").first()).toBeVisible();
  await saveShot(1280, "ar-staff-notices-desktop");
  await saveShot(390, "ar-staff-notices-phone");

  await current.setViewportSize({ width: 1280, height: 900 });
  await current.getByRole("link", { name: ar.nav.switchTo }).click();
  await expect(current).toHaveURL(/\/en\/staff\/notices$/);
  await expect(current.locator("html")).toHaveAttribute("lang", "en");
  await expect(current.getByRole("heading", { level: 1, name: en.staff.noticesTitle })).toBeVisible();
  await expect(current.locator("ol.notices li.notice").first()).toBeVisible();
  await saveShot(1280, "en-staff-notices-desktop");
  await saveShot(390, "en-staff-notices-phone");

  await current.setViewportSize({ width: 1280, height: 900 });
  await current.getByRole("link", { name: en.nav.switchTo }).click();
  await expect(current).toHaveURL(/\/ar\/staff\/notices$/);
  const entry = current.locator("li.notice", {
    has: current.getByRole("heading", { level: 2, name: titleAr }),
  });
  await entry.getByRole("link", { name: ar.staff.editLink }).click();
  await expect(current).toHaveURL(new RegExp(`/ar/staff/notices/${noticeId}$`));
  await expect(current.getByRole("heading", { level: 1, name: ar.staff.editNoticeTitle })).toBeVisible();
  await expect(current.locator("#staff-title-ar").locator("visible=true")).toBeVisible();
  await saveShot(1280, "ar-staff-notice-edit-desktop");
  await saveShot(390, "ar-staff-notice-edit-phone");

  await current.setViewportSize({ width: 1280, height: 900 });
  await current.getByRole("link", { name: ar.nav.switchTo }).click();
  await expect(current).toHaveURL(new RegExp(`/en/staff/notices/${noticeId}$`));
  await expect(current.locator("html")).toHaveAttribute("lang", "en");
  await expect(current.getByRole("heading", { level: 1, name: en.staff.editNoticeTitle })).toBeVisible();
  await expect(current.locator("#staff-title-en").locator("visible=true")).toBeVisible();
  await saveShot(1280, "en-staff-notice-edit-desktop");
  await saveShot(390, "en-staff-notice-edit-phone");
});
