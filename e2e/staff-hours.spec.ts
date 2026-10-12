import { createHmac } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import openingSlotsJson from "../content/opening-slots.json" with { type: "json" };
import ar from "../src/i18n/messages/ar.json" with { type: "json" };
import en from "../src/i18n/messages/en.json" with { type: "json" };

const PASSWORD = "synthetic-hours-password";
const BASE_URL = "http://127.0.0.1:3200";
const runId = Date.now().toString(36);
const email = `hours-${runId}@example.com`;
const noteAr = `ملاحظة ${runId}`;
const noteEn = `Friday note ${runId}`;
const SEEDED_IDS = openingSlotsJson.map((row) => row.id);

let userId = "";
let context: BrowserContext | undefined;
let page: Page;

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

type Catalogue = typeof ar;

function applyTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{([a-z]+)\}/g, (whole, name: string) => values[name] ?? whole);
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

function dayItem(current: Page, dayName: string) {
  return current.locator("li").filter({
    has: current.getByRole("heading", { level: 2, name: dayName, exact: true }),
  });
}

async function withAnonymous(
  browser: Browser,
  iso: string,
  run: (anonPage: Page) => Promise<void>,
): Promise<void> {
  const anon = await browser.newContext({
    baseURL: BASE_URL,
    timezoneId: "America/Los_Angeles",
  });
  const anonPage = await anon.newPage();
  await anonPage.clock.setFixedTime(new Date(iso));
  try {
    await run(anonPage);
  } finally {
    await anon.close();
  }
}

function todayLine(messages: Catalogue, day: "5" | "6", periods: string): string {
  return `${applyTemplate(messages.today.label, { day: messages.days[day] })} ${periods}`;
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
    const restored = await admin
      .from("opening_slots")
      .update({
        day_of_week: 6,
        opens_at: "09:00",
        closes_at: "14:00",
        note_ar: null,
        note_en: null,
      })
      .eq("id", "sat-morning")
      .select("id")
      .maybeSingle();
    if (restored.error || !restored.data) {
      throw new Error(restored.error?.code ?? "restore failed");
    }
    const listed = await admin.from("opening_slots").select("id");
    if (listed.error || !listed.data) throw new Error(listed.error?.code ?? "list failed");
    const extra = listed.data.map((row) => row.id).filter((id) => !SEEDED_IDS.includes(id));
    if (extra.length > 0) {
      const removed = await admin.from("opening_slots").delete().in("id", extra);
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

test("anonymous hours redirect to sign-in, and AAL1 is sent to the authenticator", async () => {
  const current = staffPage();
  await current.goto("/ar/staff/hours");
  await expect(current).toHaveURL(/\/ar\/staff\/sign-in$/);

  await current.getByLabel(ar.staff.emailLabel).locator("visible=true").fill(email);
  await current.getByLabel(ar.staff.passwordLabel).locator("visible=true").fill(PASSWORD);
  await current.getByRole("button", { name: ar.staff.signInSubmit }).locator("visible=true").click();
  await expect(current).toHaveURL(/\/ar\/staff\/mfa$/);
  await current.goto("/ar/staff/hours/new");
  await expect(current).toHaveURL(/\/ar\/staff\/mfa$/);

  const secret = (
    await current.locator("#staff-totp-secret").locator("visible=true").locator("bdi").innerText()
  ).trim();
  expect(secret.length).toBeGreaterThan(10);
  await current.locator("#staff-code").locator("visible=true").fill(await currentTotp(secret));
  await current.locator("form button[type='submit']").locator("visible=true").click();
  await expect(current).toHaveURL(/\/ar\/staff$/);
  await expect(current.getByRole("link", { name: ar.staff.hoursLink }).locator("visible=true")).toHaveAttribute(
    "href",
    "/ar/staff/hours",
  );
});

test("the week lists Saturday first, and the new period form rejects bad input", async () => {
  const current = staffPage();
  await current.goto("/ar/staff/hours");
  await expect(current.getByRole("heading", { level: 1, name: ar.staff.hoursTitle })).toBeVisible();
  const dayHeadings = current.getByRole("heading", { level: 2 });
  await expect(dayHeadings).toHaveCount(7);
  const order = ["6", "0", "1", "2", "3", "4", "5"] as const;
  for (const [index, day] of order.entries()) {
    await expect(dayHeadings.nth(index)).toHaveText(ar.days[day]);
  }
  const friday = dayItem(current, ar.days["5"]);
  await expect(friday.getByText(ar.state.closed)).toBeVisible();
  await expect(friday.getByRole("link", { name: ar.staff.addSlotTitle })).toHaveAttribute(
    "href",
    "/ar/staff/hours/new?day=5",
  );

  await friday.getByRole("link", { name: ar.staff.addSlotTitle }).click();
  await expect(current).toHaveURL(/\/ar\/staff\/hours\/new\?day=5$/);
  await expect(current.getByRole("heading", { level: 1, name: ar.staff.addSlotTitle })).toBeVisible();
  await expect(current.locator("#staff-day-of-week")).toHaveValue("5");
  await expect(current.locator("#staff-note-ar")).toHaveAttribute("dir", "rtl");
  await expect(current.locator("#staff-note-en")).toHaveAttribute("dir", "ltr");
  await expect(current.locator("#staff-note-ar")).not.toHaveAttribute("lang", /.+/);
  await expect(current.locator("#staff-note-en")).not.toHaveAttribute("lang", /.+/);
  await expect(current.locator("#staff-opens-at")).toHaveAttribute("type", "time");
  await expect(current.locator("#staff-closes-at")).toHaveAttribute("type", "time");
  await expect(current.locator("#staff-opens-at").locator("xpath=ancestor::bdi[@dir='ltr']")).toHaveCount(1);
  await expect(current.locator("#staff-closes-at").locator("xpath=ancestor::bdi[@dir='ltr']")).toHaveCount(1);

  await current.getByRole("button", { name: ar.staff.saveSubmit }).click();
  await expect(current).toHaveURL(/\/ar\/staff\/hours\/new\?day=5$/);
  await expect(current.getByText(ar.staff.errorRequired).first()).toBeVisible();

  await current.locator("#staff-opens-at").fill("10:00");
  await current.locator("#staff-closes-at").fill("09:00");
  await current.getByRole("button", { name: ar.staff.saveSubmit }).click();
  await expect(current.getByText(ar.staff.errorOrder)).toBeVisible();

  await current.locator("#staff-opens-at").fill("10:00");
  await current.locator("#staff-closes-at").fill("12:00");
  await current.locator("#staff-note-ar").fill(noteAr);
  await current.getByRole("button", { name: ar.staff.saveSubmit }).click();
  await expect(current).toHaveURL(/\/ar\/staff\/hours\/new\?day=5$/);
  await expect(current.locator("#staff-note-en-error")).toHaveText(ar.staff.errorNotePair);
  await expect(current.locator("#staff-note-ar-error")).toHaveCount(0);
});

test("changing Saturday morning updates the home timetable, chip and today line", async ({
  browser,
}) => {
  const current = staffPage();
  await current.goto("/ar/staff/hours/sat-morning");
  await expect(current.getByRole("heading", { level: 1, name: ar.staff.editSlotTitle })).toBeVisible();
  await expect(current.locator("#staff-closes-at")).toHaveValue("14:00");
  await current.locator("#staff-closes-at").fill("13:00");
  await current.getByRole("button", { name: ar.staff.saveSubmit }).click();
  await expect(current).toHaveURL(/\/ar\/staff\/hours\?done=changed$/);
  await expect(current.getByRole("status")).toHaveText(ar.staff.confirmChanged);

  await withAnonymous(browser, "2026-01-10T08:00:00Z", async (anonPage) => {
    for (const locale of ["ar", "en"] as const) {
      const messages = locale === "ar" ? ar : en;
      await anonPage.goto(`/${locale}`);
      await expect(anonPage.locator(".status-chip")).toHaveText(
        applyTemplate(messages.status.openUntil, { time: "13:00" }),
      );
      await expect(anonPage.locator(".today")).toHaveText(
        todayLine(messages, "6", `09:00–13:00${messages.list.and}17:00–21:00`),
      );
      await expect(anonPage.locator(".timetable .row").first()).toContainText("09:00–13:00");
    }
  });
});

test("adding a Friday period shows it on the English home page", async ({ browser }) => {
  const current = staffPage();
  await current.goto("/ar/staff/hours");
  const friday = dayItem(current, ar.days["5"]);
  await friday.getByRole("link", { name: ar.staff.addSlotTitle }).click();
  await expect(current.locator("#staff-day-of-week")).toHaveValue("5");
  await current.locator("#staff-opens-at").fill("10:00");
  await current.locator("#staff-closes-at").fill("12:00");
  await current.locator("#staff-note-ar").fill(noteAr);
  await current.locator("#staff-note-en").fill(noteEn);
  await current.getByRole("button", { name: ar.staff.saveSubmit }).click();
  await expect(current).toHaveURL(/\/ar\/staff\/hours\?done=added$/);
  await expect(current.getByRole("status")).toHaveText(ar.staff.confirmAdded);

  await withAnonymous(browser, "2026-01-09T09:00:00Z", async (anonPage) => {
    await anonPage.goto("/en");
    await expect(anonPage.locator(".status-chip")).toHaveText(
      applyTemplate(en.status.openUntil, { time: "12:00" }),
    );
    await expect(anonPage.locator(".today")).toHaveText(todayLine(en, "5", "10:00–12:00"));
    const last = anonPage.locator(".timetable .row").last();
    await expect(last).toContainText(noteEn);
    await expect(last.locator(".closed-label")).toHaveCount(0);
  });
});

test("removing the Friday period and restoring Saturday morning updates the home page", async ({
  browser,
}) => {
  const current = staffPage();
  await current.goto("/ar/staff/hours");
  const friday = dayItem(current, ar.days["5"]);
  await friday.getByRole("button", { name: ar.staff.removeSlotSubmit }).click();
  await expect(current).toHaveURL(/\/ar\/staff\/hours\?done=removed$/);
  await expect(current.getByRole("status")).toHaveText(ar.staff.confirmRemoved);

  await current.goto("/ar/staff/hours/sat-morning");
  await expect(current.locator("#staff-closes-at")).toHaveValue("13:00");
  await current.locator("#staff-closes-at").fill("14:00");
  await current.getByRole("button", { name: ar.staff.saveSubmit }).click();
  await expect(current).toHaveURL(/\/ar\/staff\/hours\?done=changed$/);

  await withAnonymous(browser, "2026-01-10T08:00:00Z", async (anonPage) => {
    for (const locale of ["ar", "en"] as const) {
      const messages = locale === "ar" ? ar : en;
      await anonPage.goto(`/${locale}`);
      await expect(anonPage.locator(".timetable .row").last().locator(".closed-label")).toHaveCount(1);
      await expect(anonPage.locator(".status-chip")).toHaveText(
        applyTemplate(messages.status.openUntil, { time: "14:00" }),
      );
    }
  });
});

test("staff hours screenshots in both locales", async () => {
  const current = staffPage();
  await current.setViewportSize({ width: 1280, height: 900 });
  await current.goto("/ar/staff/hours");
  await expect(current.getByRole("heading", { level: 1, name: ar.staff.hoursTitle })).toBeVisible();
  await expect(current.getByRole("heading", { level: 2 }).first()).toBeVisible();
  await saveShot(1280, "ar-staff-hours-desktop");
  await saveShot(390, "ar-staff-hours-phone");

  await current.setViewportSize({ width: 1280, height: 900 });
  await current.getByRole("link", { name: ar.nav.switchTo }).click();
  await expect(current).toHaveURL(/\/en\/staff\/hours$/);
  await expect(current.locator("html")).toHaveAttribute("lang", "en");
  await expect(current.getByRole("heading", { level: 1, name: en.staff.hoursTitle })).toBeVisible();
  await expect(current.getByRole("heading", { level: 2, name: en.days["6"] })).toBeVisible();
  await saveShot(1280, "en-staff-hours-desktop");
  await saveShot(390, "en-staff-hours-phone");

  await current.setViewportSize({ width: 1280, height: 900 });
  await current.getByRole("link", { name: en.nav.switchTo }).click();
  await expect(current).toHaveURL(/\/ar\/staff\/hours$/);
  const morning = dayItem(current, ar.days["6"]).locator("li").filter({ hasText: "09:00–14:00" });
  await morning.getByRole("link", { name: ar.staff.changeSlotLink }).click();
  await expect(current).toHaveURL(/\/ar\/staff\/hours\/sat-morning$/);
  await expect(current.getByRole("heading", { level: 1, name: ar.staff.editSlotTitle })).toBeVisible();
  await expect(current.locator("#staff-closes-at").locator("visible=true")).toBeVisible();
  await saveShot(1280, "ar-staff-hours-edit-desktop");
  await saveShot(390, "ar-staff-hours-edit-phone");

  await current.setViewportSize({ width: 1280, height: 900 });
  await current.getByRole("link", { name: ar.nav.switchTo }).click();
  await expect(current).toHaveURL(/\/en\/staff\/hours\/sat-morning$/);
  await expect(current.locator("html")).toHaveAttribute("lang", "en");
  await expect(current.getByRole("heading", { level: 1, name: en.staff.editSlotTitle })).toBeVisible();
  await expect(current.locator("#staff-note-en").locator("visible=true")).toBeVisible();
  await saveShot(1280, "en-staff-hours-edit-desktop");
  await saveShot(390, "en-staff-hours-edit-phone");
});
