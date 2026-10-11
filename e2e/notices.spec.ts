import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

const noticeRows = readJson("content/library-notices.json") as Array<{
  id: string;
  status: string;
  publishedOn: string;
  titleAr: string;
  titleEn: string;
}>;

const published = noticeRows
  .filter((row) => row.status === "published")
  .sort((left, right) => {
    if (left.publishedOn !== right.publishedOn) {
      return left.publishedOn < right.publishedOn ? 1 : -1;
    }
    if (left.id < right.id) return -1;
    if (left.id > right.id) return 1;
    return 0;
  });

function localisedMonth(locale: "ar" | "en", publishedOn: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: locale === "ar" ? "long" : "short",
    timeZone: "UTC",
  }).format(new Date(`${publishedOn}T00:00:00Z`));
}

test("date stamps show the day and the localised month, newest first", async ({
  page,
}) => {
  for (const locale of ["ar", "en"] as const) {
    await page.goto(`/${locale}/notices`);
    const entries = page.locator("li.notice");
    await expect(entries).toHaveCount(published.length);
    for (const [index, row] of published.entries()) {
      const entry = entries.nth(index);
      await expect(entry.locator(".stamp b")).toHaveText(
        String(Number(row.publishedOn.slice(8, 10))),
      );
      await expect(entry.locator(".stamp span")).toHaveText(
        localisedMonth(locale, row.publishedOn),
      );
      await expect(entry.locator("time.stamp")).toHaveAttribute(
        "datetime",
        row.publishedOn,
      );
      const title = locale === "ar" ? row.titleAr : row.titleEn;
      await expect(entry.getByRole("heading")).toHaveText(title);
    }
  }
});

test("entries are rule-separated list items, not cards", async ({ page }) => {
  for (const locale of ["en", "ar"] as const) {
    await page.goto(`/${locale}/notices`);
    await expect(page.locator("ol.notices")).toHaveCount(1);
    await expect(page.locator("article")).toHaveCount(0);
    const firstBorder = await page
      .locator("li.notice")
      .nth(0)
      .evaluate((el) => getComputedStyle(el).borderTopWidth);
    const secondBorder = await page
      .locator("li.notice")
      .nth(1)
      .evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(firstBorder).toBe("0px");
    expect(secondBorder).toBe("1px");
    const stampBorder = await page
      .locator(".stamp")
      .first()
      .evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(stampBorder).toBe("2px");
    const titleSpacing = await page
      .locator("li.notice")
      .nth(0)
      .getByRole("heading")
      .evaluate((el) => getComputedStyle(el).wordSpacing);
    expect(titleSpacing).toBe("0px");
  }
});

test("the stamp sits at the inline start and nothing scrolls on the phone", async ({
  page,
}) => {
  for (const locale of ["en", "ar"] as const) {
    await page.goto(`/${locale}/notices`);
    const stampBox = await page
      .locator("li.notice >> nth=0 >> .stamp")
      .boundingBox();
    const textBox = await page
      .locator("li.notice >> nth=0 >> .stamp + div")
      .boundingBox();
    if (stampBox === null || textBox === null) {
      throw new Error("missing stamp or text box");
    }
    if (locale === "en") {
      expect(stampBox.x).toBeLessThan(textBox.x);
    } else {
      expect(stampBox.x).toBeGreaterThan(textBox.x);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/ar", "/en", "/ar/notices", "/en/notices"] as const) {
    await page.goto(route);
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(fits).toBe(true);
  }
});
