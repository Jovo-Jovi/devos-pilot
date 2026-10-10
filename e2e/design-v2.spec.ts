import { expect, test } from "@playwright/test";

const routes = ["/ar", "/en", "/ar/notices", "/en/notices"] as const;

test("v2 faces are applied", async ({ page }) => {
  for (const route of ["/ar", "/en"] as const) {
    await page.goto(route);
    const h1Family = await page
      .locator("h1")
      .evaluate((el) => getComputedStyle(el).fontFamily);
    const bodyFamily = await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).fontFamily);
    expect(h1Family).toMatch(/Reem Kufi/);
    expect(bodyFamily).toMatch(/Readex Pro/);
  }
});

test("header marks the current page", async ({ page }) => {
  for (const route of routes) {
    await page.goto(route);
    const current = page.locator('header [aria-current="page"]');
    await expect(current).toHaveCount(1);
    const locale = route.startsWith("/en") ? "en" : "ar";
    const expected = route.includes("/notices")
      ? `/${locale}/notices`
      : `/${locale}`;
    await expect(current).toHaveAttribute("href", expected);
  }
});

test("phone layout has no horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of routes) {
    await page.goto(route);
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(fits).toBe(true);
  }
});

test("header tap targets are at least 44px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/ar", "/en"] as const) {
    await page.goto(route);
    const links = page.locator("header a");
    const count = await links.count();
    for (let index = 0; index < count; index += 1) {
      const box = await links.nth(index).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  }
});

test("isolation primitive is ltr", async ({ page }) => {
  for (const route of ["/ar", "/en"] as const) {
    await page.goto(route);
    await expect(page.locator("footer bdi")).toHaveAttribute("dir", "ltr");
  }
});
