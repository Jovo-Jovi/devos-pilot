import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

const profile = readJson("content/library-profile.json") as { phone: string };
const slots = readJson("content/opening-slots.json") as unknown[];
const noticeRows = readJson("content/library-notices.json") as Array<{
  status: string;
  titleEn: string;
  publishedOn: string;
}>;

function catalogue(locale: "ar" | "en"): { link: { allNotices: string } } {
  return readJson(`src/i18n/messages/${locale}.json`) as {
    link: { allNotices: string };
  };
}

const timePattern = /^\d{2}:\d{2}\u2013\d{2}:\d{2}$/;

test("home routes set lang and dir", async ({ page }) => {
  const arabic = await page.goto("/ar");
  expect(arabic?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

  const english = await page.goto("/en");
  expect(english?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("notices routes set lang and dir and unknown locales are 404", async ({ page }) => {
  const arabic = await page.goto("/ar/notices");
  expect(arabic?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

  const english = await page.goto("/en/notices");
  expect(english?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

  const unknownHome = await page.goto("/fr");
  expect(unknownHome?.status()).toBe(404);

  const unknownNotices = await page.goto("/fr/notices");
  expect(unknownNotices?.status()).toBe(404);
});

test("footer phone is inside bdi in both locales", async ({ page }) => {
  for (const locale of ["ar", "en"] as const) {
    await page.goto(`/${locale}`);
    await expect(page.locator("footer bdi")).toHaveText(profile.phone);
  }
});

test("opening-hour times are inside bdi in both locales", async ({ page }) => {
  for (const locale of ["ar", "en"] as const) {
    await page.goto(`/${locale}`);
    const cells = page.locator(".times bdi");
    await expect(cells).toHaveCount(slots.length);
    const texts = await cells.allTextContents();
    for (const text of texts) {
      expect(text).toMatch(timePattern);
    }
  }
});

test("language switch keeps the path", async ({ page }) => {
  await page.goto("/ar/notices");
  await page.locator('a[hreflang="en"]').click();
  await expect(page).toHaveURL(/\/en\/notices$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

  await page.goto("/en");
  await page.locator('a[hreflang="ar"]').click();
  await expect(page).toHaveURL(/\/ar$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("published notices render and the home teaser links to the notices page", async ({
  page,
}) => {
  const published = noticeRows.filter((row) => row.status === "published");
  const drafts = noticeRows.filter((row) => row.status === "draft");

  await page.goto("/en/notices");
  const entries = page.locator("li.notice");
  await expect(entries).toHaveCount(published.length);
  for (const row of published) {
    const entry = entries.filter({
      has: page.getByRole("heading", { name: row.titleEn, exact: true }),
    });
    await expect(entry).toHaveCount(1);
    await expect(entry.locator("time")).toHaveAttribute("datetime", row.publishedOn);
  }
  for (const row of drafts) {
    await expect(page.getByText(row.titleEn, { exact: true })).toHaveCount(0);
  }

  const teaserCount = Math.min(3, published.length);
  for (const locale of ["ar", "en"] as const) {
    await page.goto(`/${locale}`);
    await expect(page.locator("li.notice")).toHaveCount(teaserCount);
    const allNotices = page.getByRole("link", {
      name: catalogue(locale).link.allNotices,
      exact: true,
    });
    await expect(allNotices).toHaveAttribute("href", `/${locale}/notices`);
  }
});
