import { createHmac } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import ar from "../src/i18n/messages/ar.json" with { type: "json" };
import en from "../src/i18n/messages/en.json" with { type: "json" };

const NEW_PASSWORD = "synthetic-invite-password";
const OTHER_PASSWORD = "synthetic-invite-other";
const runId = Date.now().toString(36);
const invitedIds: string[] = [];
const messageIds: string[] = [];
let usedLink = "";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function address(n: number): string {
  return `invite-${runId}-${n}@example.com`;
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

function mailBase(): string {
  const url = process.env.SUPABASE_MAIL_URL;
  if (!url) throw new Error("mail url is not set");
  return url;
}

async function inviteAccount(addressValue: string, grantClaim: boolean): Promise<void> {
  const admin = adminClient();
  const invited = await admin.auth.admin.inviteUserByEmail(addressValue);
  if (invited.error || !invited.data.user) {
    throw new Error(invited.error?.code ?? "invite failed");
  }
  invitedIds.push(invited.data.user.id);
  if (!grantClaim) return;
  const granted = await admin.auth.admin.updateUserById(invited.data.user.id, {
    app_metadata: { staff: true },
  });
  if (granted.error) throw new Error(granted.error.code ?? "claim failed");
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
  if (!href) {
    throw new Error(
      decoded.includes("/staff/auth/confirm")
        ? "invite link quotes mismatch"
        : "invite link missing",
    );
  }
  const url = new URL(href);
  if (!url.pathname.endsWith("/ar/staff/auth/confirm")) {
    throw new Error(`invite path mismatch: ${url.pathname}`);
  }
  if (url.searchParams.get("type") !== "invite" || !url.searchParams.get("token_hash")) {
    throw new Error("invite query mismatch");
  }
  return href;
}

async function openInvite(page: Page, href: string): Promise<void> {
  const finalResponse = await page.goto(href);
  if (!finalResponse) throw new Error("invite navigation failed");
  let request = finalResponse.request().redirectedFrom();
  let cacheControl = "";
  while (request) {
    const url = new URL(request.url());
    if (url.pathname.endsWith("/staff/auth/confirm")) {
      const response = await request.response();
      cacheControl = response?.headers()["cache-control"] ?? "";
      break;
    }
    request = request.redirectedFrom();
  }
  expect(cacheControl, "confirm cache-control").toContain("no-store");
}

async function saveShot(page: Page, width: number, name: string): Promise<void> {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  await page.evaluate(() => document.fonts.ready);
  const path = join(process.cwd(), `.devos/screens/${name}.png`);
  mkdirSync(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

test.describe.configure({ mode: "serial" });

test("invitation sets a password, enrols TOTP, and reaches the staff home", async ({ page }) => {
  test.setTimeout(180_000);
  const email = address(1);
  await inviteAccount(email, true);
  const html = await waitForInvite(email);
  usedLink = inviteHref(html);
  await openInvite(page, usedLink);
  await expect(page).toHaveURL(/\/ar\/staff\/password$/);
  expect(new URL(page.url()).search).toBe("");
  await expect(
    page.getByRole("heading", { level: 1, name: ar.staff.passwordTitle }).locator("visible=true"),
  ).toBeVisible();

  const newPassword = page.locator("#staff-new-password").locator("visible=true");
  const confirmPassword = page.locator("#staff-confirm-password").locator("visible=true");
  await expect(newPassword).toHaveAttribute("type", "password");
  await expect(newPassword).toHaveAttribute("autocomplete", "new-password");
  await expect(confirmPassword).toHaveAttribute("type", "password");
  await expect(confirmPassword).toHaveAttribute("autocomplete", "new-password");
  await newPassword.fill(NEW_PASSWORD);
  await confirmPassword.fill(OTHER_PASSWORD);
  await page.locator("form button[type='submit']").locator("visible=true").click();
  await expect(page.getByRole("status").locator("visible=true")).toHaveText(ar.staff.errorMismatch);
  await expect(page.getByText(NEW_PASSWORD)).toHaveCount(0);
  await expect(page.getByText(OTHER_PASSWORD)).toHaveCount(0);

  await saveShot(page, 1280, "ar-staff-password-desktop");
  await saveShot(page, 390, "ar-staff-password-phone");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("link", { name: ar.nav.switchTo }).locator("visible=true").click();
  await expect(page).toHaveURL(/\/en\/staff\/password$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.locator("#staff-new-password").locator("visible=true").fill(NEW_PASSWORD);
  await page.locator("#staff-confirm-password").locator("visible=true").fill(OTHER_PASSWORD);
  await page.locator("form button[type='submit']").locator("visible=true").click();
  await expect(page.getByRole("status").locator("visible=true")).toHaveText(en.staff.errorMismatch);
  await saveShot(page, 1280, "en-staff-password-desktop");
  await saveShot(page, 390, "en-staff-password-phone");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("link", { name: en.nav.switchTo }).locator("visible=true").click();
  await expect(page).toHaveURL(/\/ar\/staff\/password$/);
  await page.locator("#staff-new-password").locator("visible=true").fill(NEW_PASSWORD);
  await page.locator("#staff-confirm-password").locator("visible=true").fill(NEW_PASSWORD);
  await page.locator("form button[type='submit']").locator("visible=true").click();
  await expect(page).toHaveURL(/\/ar\/staff\/mfa$/);
  await expect(page.getByRole("img", { name: ar.staff.qrLabel })).toBeVisible();
  const secret = (
    await page.locator("#staff-totp-secret").locator("visible=true").locator("bdi").innerText()
  ).trim();
  expect(secret.length).toBeGreaterThan(10);
  await page.locator("#staff-code").locator("visible=true").fill(await currentTotp(secret));
  await page.locator("form button[type='submit']").locator("visible=true").click();
  await expect(page).toHaveURL(/\/ar\/staff$/);
  await expect(page.locator("bdi", { hasText: email }).locator("visible=true")).toBeVisible();

  await page.getByRole("button", { name: ar.staff.signOutSubmit }).locator("visible=true").click();
  await expect(page).toHaveURL(/\/ar\/staff\/sign-in$/);
  await page.getByLabel(ar.staff.emailLabel).locator("visible=true").fill(email);
  await page.getByLabel(ar.staff.passwordLabel).locator("visible=true").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: ar.staff.signInSubmit }).locator("visible=true").click();
  await expect(page).toHaveURL(/\/ar\/staff\/mfa$/);
  await expect(page.locator("#staff-totp-secret").locator("visible=true")).toHaveCount(0);
  await expect(page.getByRole("img", { name: ar.staff.qrLabel })).toHaveCount(0);
  await expect(page.locator("#staff-code").locator("visible=true")).toBeVisible();

  await page.goto("/ar/staff/password");
  await expect(page).toHaveURL(/\/ar\/staff\/mfa$/);
  await page.locator("#staff-code").locator("visible=true").fill(await currentTotp(secret));
  await page.locator("form button[type='submit']").locator("visible=true").click();
  await expect(page).toHaveURL(/\/ar\/staff$/);
  await expect(page.locator("bdi", { hasText: email }).locator("visible=true")).toBeVisible();
});

test("a used invitation link ends at the link error", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(usedLink);
    await expect(page).toHaveURL(/\/ar\/staff\/sign-in\?error=link$/);
    await expect(page.getByRole("status")).toHaveText(ar.staff.errorLink);
    await page.goto("/ar/staff");
    await expect(page).toHaveURL(/\/ar\/staff\/sign-in$/);
  } finally {
    await context.close();
  }
});

test("an invitation without the staff claim is refused and leaves no session", async ({ page }) => {
  test.setTimeout(60_000);
  const email = address(2);
  await inviteAccount(email, false);
  const href = inviteHref(await waitForInvite(email));
  await page.goto(href);
  await expect(page).toHaveURL(/\/ar\/staff\/sign-in\?error=refused$/);
  await expect(page.getByRole("status")).toHaveText(ar.staff.errorRefused);
  await page.goto("/ar/staff");
  await expect(page).toHaveURL(/\/ar\/staff\/sign-in$/);
});

test("a recovery link and a missing token redirect without a cookie", async ({ request }) => {
  for (const path of [
    "/ar/staff/auth/confirm?token_hash=x&type=recovery",
    "/ar/staff/auth/confirm?type=invite",
  ]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.status()).toBeLessThan(400);
    const location = response.headers()["location"] ?? "";
    expect(location.endsWith("/ar/staff/sign-in?error=link")).toBe(true);
    expect(location.includes("token_hash")).toBe(false);
    expect(response.headers()["set-cookie"]).toBeUndefined();
    expect(response.headers()["cache-control"] ?? "").toContain("no-store");
  }
});

test("an anonymous password page redirects to sign-in", async ({ page }) => {
  await page.goto("/ar/staff/password");
  await expect(page).toHaveURL(/\/ar\/staff\/sign-in$/);
});

test.afterAll(async () => {
  if (invitedIds.length > 0) {
    const admin = adminClient();
    for (const id of invitedIds) {
      const removed = await admin.auth.admin.deleteUser(id);
      if (removed.error) throw new Error(removed.error.code ?? "delete failed");
    }
  }
  if (messageIds.length === 0) return;
  const response = await fetch(new URL("/api/v1/messages", mailBase()), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ IDs: messageIds }),
  });
  if (!response.ok) throw new Error(`mail delete ${response.status}`);
});
