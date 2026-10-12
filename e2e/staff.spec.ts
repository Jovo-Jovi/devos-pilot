import { createHmac } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import ar from "../src/i18n/messages/ar.json" with { type: "json" };
import en from "../src/i18n/messages/en.json" with { type: "json" };

const PASSWORD = "synthetic-test-password";
const TOTP_SECRET = "PILOTTOTPSECRETA";
const STAFF_ENROL = "staff-enrol@example.com";
const STAFF_TOTP = "staff-totp@example.com";
const VISITOR = "visitor-account@example.com";

const BASELINE_HEADERS: Record<string, string> = {
  "strict-transport-security": "max-age=86400",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "x-frame-options": "DENY",
};

let enrolledSecret = "";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

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

function publicAuth(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("supabase public env is not set");
  return { url, publishableKey };
}

async function shot(page: Page, route: string, width: number, name: string) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  await page.goto(route, { waitUntil: "load" });
  await page.locator("form").waitFor({ state: "visible" });
  await page.evaluate(() => document.fonts.ready);
  const relative = `.devos/screens/${name}.png`;
  const path = join(process.cwd(), relative);
  mkdirSync(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

test.describe.configure({ mode: "serial" });

test("totp matches the RFC 6238 vector", () => {
  expect(totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 59_000)).toBe("287082");
  expect(totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 1_111_111_109_000)).toBe("081804");
});

test("public routes stay cookieless with the baseline CSP", async ({ request }) => {
  for (const path of ["/ar", "/en", "/ar/notices", "/en/notices"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["set-cookie"]).toBeUndefined();
    const csp = response.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("form-action 'none'");
    expect(csp).not.toContain("form-action 'self'");
    for (const [name, value] of Object.entries(BASELINE_HEADERS)) {
      expect(response.headers()[name]).toBe(value);
    }
  }
});

test("staff pages send form-action self", async ({ request }) => {
  for (const path of ["/ar/staff/sign-in", "/en/staff/sign-in", "/ar/staff/mfa"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const csp = response.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("form-action 'self'");
    expect(csp).not.toContain("form-action 'none'");
    expect(csp).toContain("connect-src 'self'");
  }
});

test("sign-in screenshots in both locales", async ({ page }) => {
  await shot(page, "/ar/staff/sign-in", 1280, "ar-staff-sign-in-desktop");
  await shot(page, "/ar/staff/sign-in", 390, "ar-staff-sign-in-phone");
  await shot(page, "/en/staff/sign-in", 1280, "en-staff-sign-in-desktop");
  await shot(page, "/en/staff/sign-in", 390, "en-staff-sign-in-phone");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1, name: en.staff.signInTitle })).toBeVisible();
});

test("anonymous staff home redirects to sign-in", async ({ page }) => {
  await page.goto("/ar/staff");
  await expect(page).toHaveURL(/\/ar\/staff\/sign-in$/);
  await expect(page.getByRole("heading", { level: 1, name: ar.staff.signInTitle })).toBeVisible();
});

test("a wrong password shows one generic message", async ({ page }) => {
  const wrong = "wrong-synthetic-password";
  await page.goto("/ar/staff/sign-in");
  await page.getByLabel(ar.staff.emailLabel).fill(STAFF_ENROL);
  await page.getByLabel(ar.staff.passwordLabel).fill(wrong);
  await page.getByRole("button", { name: ar.staff.signInSubmit }).click();
  await expect(page.getByRole("status")).toHaveText(ar.staff.errorGeneric);
  await expect(page.getByText(wrong)).toHaveCount(0);
  await expect(page.locator("#staff-password")).toHaveAttribute("type", "password");
  await expect(page).toHaveURL(/\/ar\/staff\/sign-in$/);
});

test("an account without the staff claim is refused and signed out", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/ar/staff/sign-in");
  await page.getByLabel(ar.staff.emailLabel).fill(VISITOR);
  await page.getByLabel(ar.staff.passwordLabel).fill(PASSWORD);
  await page.getByRole("button", { name: ar.staff.signInSubmit }).click();
  await expect(page).toHaveURL(/\/ar\/staff\/sign-in\?error=refused$/);
  await expect(page.getByRole("status")).toHaveText(ar.staff.errorRefused);
  await page.goto("/ar/staff");
  await expect(page).toHaveURL(/\/ar\/staff\/sign-in$/);
});

test("sign-in then enrolment then the staff home", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/ar/staff/sign-in");
  await page.getByLabel(ar.staff.emailLabel).fill(STAFF_ENROL);
  await page.getByLabel(ar.staff.passwordLabel).fill(PASSWORD);
  await page.getByRole("button", { name: ar.staff.signInSubmit }).click();
  await expect(page).toHaveURL(/\/ar\/staff\/mfa$/);
  await expect(page.getByRole("img", { name: ar.staff.qrLabel })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: join(process.cwd(), ".devos/screens/ar-staff-mfa-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: join(process.cwd(), ".devos/screens/ar-staff-mfa-phone.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("link", { name: ar.nav.switchTo }).click();
  await expect(page).toHaveURL(/\/en\/staff\/mfa$/);
  await expect(page.getByRole("img", { name: en.staff.qrLabel })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: join(process.cwd(), ".devos/screens/en-staff-mfa-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: join(process.cwd(), ".devos/screens/en-staff-mfa-phone.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("link", { name: en.nav.switchTo }).click();
  await expect(page).toHaveURL(/\/ar\/staff\/mfa$/);
  const secret = (
    await page.locator("#staff-totp-secret").locator("visible=true").locator("bdi").innerText()
  ).trim();
  enrolledSecret = secret;
  expect(secret.length).toBeGreaterThan(10);
  const code = await currentTotp(secret);
  await page.locator("#staff-code").locator("visible=true").fill(code);
  await page.locator("form button[type='submit']").locator("visible=true").click();
  await expect(page).toHaveURL(/\/ar\/staff$/);
  await expect(page.locator("bdi", { hasText: STAFF_ENROL }).locator("visible=true")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const home = await page.goto("/ar/staff");
  expect(home?.headers()["content-security-policy"]).toContain("form-action 'self'");
  await expect(page.getByRole("button", { name: ar.staff.signOutSubmit })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: join(process.cwd(), ".devos/screens/ar-staff-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: join(process.cwd(), ".devos/screens/ar-staff-phone.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("link", { name: ar.nav.switchTo }).click();
  await expect(page).toHaveURL(/\/en\/staff$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator("bdi", { hasText: STAFF_ENROL }).locator("visible=true")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: join(process.cwd(), ".devos/screens/en-staff-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: join(process.cwd(), ".devos/screens/en-staff-phone.png"),
    fullPage: true,
  });
});

test("sign-in then challenge then the staff home", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/en/staff/sign-in");
  await page.getByLabel(en.staff.emailLabel).fill(STAFF_TOTP);
  await page.getByLabel(en.staff.passwordLabel).fill(PASSWORD);
  await page.getByRole("button", { name: en.staff.signInSubmit }).click();
  await expect(page).toHaveURL(/\/en\/staff\/mfa$/);
  await expect(page.locator("#staff-totp-secret")).toHaveCount(0);
  const code = await currentTotp(TOTP_SECRET);
  await page.getByLabel(en.staff.codeLabel).fill(code);
  await page.getByRole("button", { name: en.staff.verifySubmit }).click();
  await expect(page).toHaveURL(/\/en\/staff$/);
  await expect(page.locator("bdi", { hasText: STAFF_TOTP })).toBeVisible();
  await page.getByRole("button", { name: en.staff.signOutSubmit }).click();
  await expect(page).toHaveURL(/\/en\/staff\/sign-in$/);
});

test("sign-up is refused", async () => {
  const { url, publishableKey } = publicAuth();
  const response = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "signup-probe@example.com",
      password: PASSWORD,
    }),
  });
  const text = await response.text();
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.status).toBeLessThan(500);
  expect(text).toContain("signup_disabled");
});

test.afterAll(async () => {
  if (!enrolledSecret) return;
  const { url, publishableKey } = publicAuth();
  const supabase = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const signedIn = await supabase.auth.signInWithPassword({
    email: STAFF_ENROL,
    password: PASSWORD,
  });
  if (signedIn.error) throw new Error(signedIn.error.code ?? "cleanup sign-in failed");
  const listed = await supabase.auth.mfa.listFactors();
  if (listed.error) throw new Error(listed.error.code ?? "cleanup list failed");
  const factor = listed.data?.totp?.[0];
  if (!factor) return;
  const code = await currentTotp(enrolledSecret);
  const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
  if (challenge.error || !challenge.data) {
    throw new Error(challenge.error?.code ?? "cleanup challenge failed");
  }
  const verified = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.data.id,
    code,
  });
  if (verified.error) throw new Error(verified.error.code ?? "cleanup verify failed");
  const removed = await supabase.auth.mfa.unenroll({ factorId: factor.id });
  if (removed.error) throw new Error(removed.error.code ?? "cleanup unenroll failed");
});
