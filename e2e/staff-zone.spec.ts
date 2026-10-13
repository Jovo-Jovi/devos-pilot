import { createHmac } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import noticesJson from "../content/library-notices.json" with { type: "json" };
import openingSlotsJson from "../content/opening-slots.json" with { type: "json" };
import ar from "../src/i18n/messages/ar.json" with { type: "json" };

const ZONE_PASSWORD = "synthetic-zone-password";
const SEEDED_PASSWORD = "synthetic-test-password";
const BASE_URL = "http://127.0.0.1:3200";
const PUBLISHED_ID = "reading-club-october";
const TUESDAY_ID = "tue";
const SEEDED_PERIOD_IDS = openingSlotsJson.map((row) => row.id);
const runId = Date.now().toString(36);
const zoneAddress = `zone-${runId}@example.com`;
const titleAr = `عنوان المنطقة ${runId}`;
const titleEn = `Zone title ${runId}`;
const bodyAr = `متن المنطقة ${runId}`;
const bodyEn = `Zone body ${runId}`;
const shortenedHours = "09:00\u201320:00";
const publishedOn = dayAfter(
  noticesJson.reduce((latest, row) => (row.publishedOn > latest ? row.publishedOn : latest), ""),
);

const messageIds: string[] = [];
let invitedAccountId = "";
let libraryNoticeId = "";
let context: BrowserContext | undefined;
let page: Page;

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

type AuthFailure = { status?: number; code?: string } | null;

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

function publishableClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("supabase public env is not set");
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function mailBase(): string {
  const url = process.env.SUPABASE_MAIL_URL;
  if (!url) throw new Error("mail url is not set");
  return url;
}

function isRateLimited(error: AuthFailure): boolean {
  return error?.status === 429 || error?.code === "over_request_rate_limit";
}

async function pauseForRateLimit(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));
}

function staffPage(): Page {
  if (!page) throw new Error("staff page is not open");
  return page;
}

async function inviteAccount(addressValue: string): Promise<void> {
  const admin = adminClient();
  if (!invitedAccountId) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const invited = await admin.auth.admin.inviteUserByEmail(addressValue);
      if (!invited.error && invited.data.user) {
        invitedAccountId = invited.data.user.id;
        break;
      }
      if (isRateLimited(invited.error) && attempt === 0) {
        await pauseForRateLimit();
        continue;
      }
      throw new Error(invited.error?.code ?? "invite failed");
    }
  }
  if (!invitedAccountId) throw new Error("invite failed");
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const granted = await admin.auth.admin.updateUserById(invitedAccountId, {
      app_metadata: { staff: true },
    });
    if (!granted.error) return;
    if (isRateLimited(granted.error) && attempt === 0) {
      await pauseForRateLimit();
      continue;
    }
    throw new Error(granted.error.code ?? "claim failed");
  }
  throw new Error("claim failed");
}

async function waitForInvite(addressValue: string): Promise<string> {
  const deadline = Date.now() + 10_000;
  const search = new URL("/api/v1/search", mailBase());
  search.searchParams.set("query", `to:${addressValue}`);
  while (Date.now() < deadline) {
    const response = await fetch(search);
    if (response.ok) {
      const body = (await response.json()) as { messages?: { ID?: string }[] };
      const id = body.messages?.[0]?.ID;
      if (id) {
        messageIds.push(id);
        const message = await fetch(new URL(`/api/v1/message/${id}`, mailBase()));
        if (!message.ok) throw new Error(`mail message ${message.status}`);
        const detail = (await message.json()) as { HTML?: string; Text?: string };
        const html = detail.HTML || detail.Text || "";
        if (!html) throw new Error("invite mail had no body");
        return html;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error("invite mail did not arrive");
}

function inviteHref(html: string): string {
  const decoded = html.replaceAll("&amp;", "&");
  const match = decoded.match(/href="([^"]+)"/);
  const href = match?.[1];
  if (!href) throw new Error("invite link missing");
  const url = new URL(href);
  if (!url.pathname.endsWith("/ar/staff/auth/confirm")) {
    throw new Error(`invite path mismatch: ${url.pathname}`);
  }
  if (url.searchParams.get("type") !== "invite" || !url.searchParams.get("token_hash")) {
    throw new Error("invite query mismatch");
  }
  return href;
}

async function signInWithPassword(client: SupabaseClient, email: string): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const signedIn = await client.auth.signInWithPassword({
      email,
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

async function withAnonymous(browser: Browser, run: (anonPage: Page) => Promise<void>): Promise<void> {
  const anon = await browser.newContext({ baseURL: BASE_URL });
  const anonPage = await anon.newPage();
  try {
    await run(anonPage);
  } finally {
    await anon.close();
  }
}

test.describe.configure({ mode: "serial", timeout: 720_000 });

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext({ baseURL: BASE_URL });
  page = await context.newPage();
});

test.afterAll(async () => {
  try {
    const admin = adminClient();
    if (libraryNoticeId) {
      const drafted = await admin
        .from("library_notices")
        .update({ status: "draft" })
        .eq("id", libraryNoticeId);
      if (drafted.error) throw new Error(drafted.error.code ?? "draft failed");
      const removed = await admin.from("library_notices").delete().eq("id", libraryNoticeId);
      if (removed.error) throw new Error(removed.error.code ?? "delete failed");
    }
    const restored = await admin
      .from("opening_slots")
      .update({
        day_of_week: 2,
        opens_at: "09:00",
        closes_at: "21:00",
        note_ar: null,
        note_en: null,
      })
      .eq("id", TUESDAY_ID)
      .select("id")
      .maybeSingle();
    if (restored.error || !restored.data) {
      throw new Error(restored.error?.code ?? "restore failed");
    }
    const listed = await admin.from("opening_slots").select("id");
    if (listed.error || !listed.data) throw new Error(listed.error?.code ?? "list failed");
    const extra = listed.data.map((row) => row.id).filter((id) => !SEEDED_PERIOD_IDS.includes(id));
    if (extra.length > 0) {
      const removed = await admin.from("opening_slots").delete().in("id", extra);
      if (removed.error) throw new Error(removed.error.code ?? "delete failed");
    }
    if (invitedAccountId) {
      const removed = await admin.auth.admin.deleteUser(invitedAccountId);
      if (removed.error) throw new Error(removed.error.code ?? "delete account failed");
    }
    if (messageIds.length > 0) {
      const response = await fetch(new URL("/api/v1/messages", mailBase()), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ IDs: messageIds }),
      });
      if (!response.ok) throw new Error(`mail delete ${response.status}`);
    }
  } finally {
    await context?.close();
  }
});

test("an invited account sets a password, enrols TOTP, and reaches the staff home", async () => {
  const current = staffPage();
  await inviteAccount(zoneAddress);
  const href = inviteHref(await waitForInvite(zoneAddress));
  await current.goto(href);
  await expect(current).toHaveURL(/\/ar\/staff\/password$/);
  expect(new URL(current.url()).search).toBe("");
  await current.locator("#staff-new-password").locator("visible=true").fill(ZONE_PASSWORD);
  await current.locator("#staff-confirm-password").locator("visible=true").fill(ZONE_PASSWORD);
  await current.locator("form button[type='submit']").locator("visible=true").click();
  await expect(current).toHaveURL(/\/ar\/staff\/mfa$/);
  const secret = (
    await current.locator("#staff-totp-secret").locator("visible=true").locator("bdi").innerText()
  ).trim();
  expect(secret.length).toBeGreaterThan(10);
  await current.locator("#staff-code").locator("visible=true").fill(await currentTotp(secret));
  await current.locator("form button[type='submit']").locator("visible=true").click();
  await expect(current).toHaveURL(/\/ar\/staff$/);
  await expect(current.locator("bdi", { hasText: zoneAddress }).locator("visible=true")).toBeVisible();
});

test("a draft LibraryNotice stays unread through the publishable key", async () => {
  const current = staffPage();
  for (const row of noticesJson) {
    expect(publishedOn > row.publishedOn).toBe(true);
  }
  await current.goto("/ar/staff/notices/new");
  await current.locator("#staff-published-on").fill(publishedOn);
  await current.locator("#staff-title-ar").fill(titleAr);
  await current.locator("#staff-title-en").fill(titleEn);
  await current.locator("#staff-body-ar").fill(bodyAr);
  await current.locator("#staff-body-en").fill(bodyEn);
  await current.getByRole("button", { name: ar.staff.saveSubmit }).click();
  await expect(current).toHaveURL(/\/ar\/staff\/notices\/[a-z0-9-]+\?done=saved$/);
  libraryNoticeId = new URL(current.url()).pathname.split("/").at(-1) ?? "";
  expect(libraryNoticeId).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

  const reader = publishableClient();
  const drafts = await reader.from("library_notices").select("id").eq("status", "draft");
  expect(drafts.error).toBeNull();
  expect(drafts.data).toEqual([]);
  const byId = await reader.from("library_notices").select("id").eq("id", libraryNoticeId);
  expect(byId.error).toBeNull();
  expect(byId.data).toEqual([]);
});

test("publishing shows the LibraryNotice on the public routes in both locales", async ({
  browser,
}) => {
  const current = staffPage();
  await current.goto(`/ar/staff/notices/${libraryNoticeId}`);
  await current.getByRole("button", { name: ar.staff.publishSubmit }).click();
  await expect(current).toHaveURL(new RegExp(`/ar/staff/notices/${libraryNoticeId}\\?done=published$`));

  await withAnonymous(browser, async (anonPage) => {
    await anonPage.goto("/ar/notices");
    await expect(anonPage.getByRole("heading", { level: 2, name: titleAr })).toBeVisible();
    await anonPage.goto("/en/notices");
    await expect(anonPage.getByRole("heading", { level: 2, name: titleEn })).toBeVisible();
    await anonPage.goto("/ar");
    await expect(anonPage.locator("li.notice")).toHaveCount(3);
    await expect(anonPage.getByRole("heading", { level: 3, name: titleAr })).toBeVisible();
    await anonPage.goto("/en");
    await expect(anonPage.locator("li.notice")).toHaveCount(3);
    await expect(anonPage.getByRole("heading", { level: 3, name: titleEn })).toBeVisible();
  });
});

test("an overlapping unpublish leaves the LibraryNotice off the public routes", async ({
  browser,
}) => {
  const current = staffPage();
  await current.goto(`/ar/staff/notices/${libraryNoticeId}`);
  await expect(current.getByRole("button", { name: ar.staff.unpublishSubmit })).toBeVisible();

  const prepared: { context: BrowserContext; arPage: Page; enPage: Page }[] = [];
  for (let index = 0; index < 5; index += 1) {
    const anon = await browser.newContext({ baseURL: BASE_URL });
    prepared.push({
      context: anon,
      arPage: await anon.newPage(),
      enPage: await anon.newPage(),
    });
  }
  try {
    await Promise.all([
      current.getByRole("button", { name: ar.staff.unpublishSubmit }).click(),
      ...prepared.flatMap((entry) => [entry.arPage.goto("/ar"), entry.enPage.goto("/en")]),
    ]);
    await expect(current).toHaveURL(
      new RegExp(`/ar/staff/notices/${libraryNoticeId}\\?done=unpublished$`),
    );
  } finally {
    await Promise.all(prepared.map((entry) => entry.context.close()));
  }

  await withAnonymous(browser, async (anonPage) => {
    for (const path of ["/ar", "/en", "/ar/notices", "/en/notices"]) {
      await anonPage.goto(path);
      await expect(anonPage.getByText(titleAr)).toHaveCount(0);
      await expect(anonPage.getByText(titleEn)).toHaveCount(0);
    }
  });
});

test("writes without the staff claim at AAL2 are refused", async () => {
  const admin = adminClient();
  const beforeNotice = await admin
    .from("library_notices")
    .select("id, status, published_on, title_ar, title_en, body_ar, body_en")
    .eq("id", PUBLISHED_ID)
    .single();
  if (beforeNotice.error || !beforeNotice.data) {
    throw new Error(beforeNotice.error?.code ?? "published row missing");
  }
  const beforeTuesday = await admin
    .from("opening_slots")
    .select("id, day_of_week, opens_at, closes_at, note_ar, note_en")
    .eq("id", TUESDAY_ID)
    .single();
  if (beforeTuesday.error || !beforeTuesday.data) {
    throw new Error(beforeTuesday.error?.code ?? "tuesday row missing");
  }

  const principals: { name: string; email: string | null }[] = [
    { name: "anon", email: null },
    { name: "visitor", email: "visitor-account@example.com" },
    { name: "aal1", email: "staff-totp@example.com" },
  ];
  const probeNoticeIds: string[] = [];
  const probePeriodIds: string[] = [];

  for (const principal of principals) {
    const client = publishableClient();
    const probeNoticeId = `zone-rest-${principal.name}-${runId}`;
    const probePeriodId = `zone-period-${principal.name}-${runId}`;
    probeNoticeIds.push(probeNoticeId);
    probePeriodIds.push(probePeriodId);
    try {
      if (principal.email) await signInWithPassword(client, principal.email);
      const insertedNotice = await client
        .from("library_notices")
        .insert({
          id: probeNoticeId,
          status: "draft",
          published_on: publishedOn,
          title_ar: titleAr,
          title_en: titleEn,
          body_ar: bodyAr,
          body_en: bodyEn,
        })
        .select("id");
      assertInsertRefused(insertedNotice.error);
      const insertedPeriod = await client
        .from("opening_slots")
        .insert({
          id: probePeriodId,
          day_of_week: 5,
          opens_at: "10:00",
          closes_at: "12:00",
        })
        .select("id");
      assertInsertRefused(insertedPeriod.error);
      const updatedNotice = await client
        .from("library_notices")
        .update({ title_en: `Zone refused ${runId}` })
        .eq("id", PUBLISHED_ID)
        .select("id");
      assertMutationRefused(updatedNotice.error, updatedNotice.data);
      const updatedPeriod = await client
        .from("opening_slots")
        .update({ closes_at: "20:00" })
        .eq("id", TUESDAY_ID)
        .select("id");
      assertMutationRefused(updatedPeriod.error, updatedPeriod.data);
      const deletedPeriod = await client
        .from("opening_slots")
        .delete()
        .eq("id", TUESDAY_ID)
        .select("id");
      assertMutationRefused(deletedPeriod.error, deletedPeriod.data);
    } finally {
      const signedOut = await client.auth.signOut();
      if (signedOut.error) throw new Error(signedOut.error.code ?? "sign-out failed");
    }
  }

  const afterNotice = await admin
    .from("library_notices")
    .select("id, status, published_on, title_ar, title_en, body_ar, body_en")
    .eq("id", PUBLISHED_ID)
    .single();
  expect(afterNotice.error).toBeNull();
  expect(afterNotice.data).toEqual(beforeNotice.data);
  const afterTuesday = await admin
    .from("opening_slots")
    .select("id, day_of_week, opens_at, closes_at, note_ar, note_en")
    .eq("id", TUESDAY_ID)
    .single();
  expect(afterTuesday.error).toBeNull();
  expect(afterTuesday.data).toEqual(beforeTuesday.data);
  const leakedNotices = await admin.from("library_notices").select("id").in("id", probeNoticeIds);
  expect(leakedNotices.error).toBeNull();
  expect(leakedNotices.data).toEqual([]);
  const leakedPeriods = await admin.from("opening_slots").select("id").in("id", probePeriodIds);
  expect(leakedPeriods.error).toBeNull();
  expect(leakedPeriods.data).toEqual([]);
});

test("Tuesday's close follows on both home pages and then returns", async ({ browser }) => {
  const current = staffPage();
  await current.goto(`/ar/staff/hours/${TUESDAY_ID}`);
  await expect(current.locator("#staff-closes-at")).toHaveValue("21:00");
  await current.locator("#staff-closes-at").fill("20:00");
  await current.getByRole("button", { name: ar.staff.saveSubmit }).click();
  await expect(current).toHaveURL(/\/ar\/staff\/hours\?done=changed$/);

  await withAnonymous(browser, async (anonPage) => {
    for (const path of ["/en", "/ar"]) {
      await anonPage.goto(path);
      await expect(anonPage.locator("body")).toContainText(shortenedHours);
    }
  });

  await current.goto(`/ar/staff/hours/${TUESDAY_ID}`);
  await current.locator("#staff-closes-at").fill("21:00");
  await current.getByRole("button", { name: ar.staff.saveSubmit }).click();
  await expect(current).toHaveURL(/\/ar\/staff\/hours\?done=changed$/);

  await withAnonymous(browser, async (anonPage) => {
    for (const path of ["/en", "/ar"]) {
      await anonPage.goto(path);
      await expect(anonPage.getByText(shortenedHours)).toHaveCount(0);
    }
  });
});

test("public responses stay cookieless and formless", async ({ request }) => {
  for (const path of ["/ar", "/en", "/ar/notices", "/en/notices"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["set-cookie"]).toBeUndefined();
    expect(response.headers()["content-security-policy"] ?? "").toContain("form-action 'none'");
    const html = await response.text();
    expect(html.includes("<form")).toBe(false);
    expect(html.includes("<input")).toBe(false);
    expect(html.includes("<textarea")).toBe(false);
    expect(html.includes("<select")).toBe(false);
  }
});
