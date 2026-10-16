import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import ar from "../src/i18n/messages/ar.json" with { type: "json" };
import en from "../src/i18n/messages/en.json" with { type: "json" };

const catalogues = { ar, en } as const;

type SeedBookType = {
  id: string;
  nameAr: string;
  nameEn: string;
  sortOrder: number;
};

const bookTypes = (
  JSON.parse(
    readFileSync(join(process.cwd(), "firebase/seed/book_types.json"), "utf8"),
  ) as SeedBookType[]
).sort((left, right) => {
  if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
});

async function shot(
  page: Page,
  route: string,
  width: number,
  height: number,
  name: string,
) {
  await page.setViewportSize({ width, height });
  await page.goto(route, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const path = join(process.cwd(), `.devos/screens/${name}.png`);
  mkdirSync(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

test("both locales list the seeded book types in sort order", async ({
  page,
}) => {
  for (const locale of ["ar", "en"] as const) {
    await page.goto(`/${locale}/book-types`);
    await expect(page.locator("html")).toHaveAttribute(
      "dir",
      locale === "ar" ? "rtl" : "ltr",
    );
    await expect(page.locator("h1")).toHaveText(
      catalogues[locale].bookTypes.title,
    );
    const entries = page.locator("li.book-type");
    await expect(entries).toHaveCount(bookTypes.length);
    for (const [index, row] of bookTypes.entries()) {
      const name = locale === "ar" ? row.nameAr : row.nameEn;
      await expect(entries.nth(index).locator("h2")).toHaveText(name);
    }
  }
});

test("cover placeholders sit at the inline start and no image is shown", async ({
  page,
}) => {
  for (const locale of ["en", "ar"] as const) {
    await page.goto(`/${locale}/book-types`);
    const covers = page.locator("ol.book-types .cover");
    await expect(covers).toHaveCount(bookTypes.length);
    for (let index = 0; index < bookTypes.length; index += 1) {
      await expect(covers.nth(index)).toHaveAttribute("aria-hidden", "true");
    }
    await expect(page.locator("ol.book-types img")).toHaveCount(0);
    const coverBox = await page
      .locator("li.book-type >> nth=0 >> .cover")
      .boundingBox();
    const textBox = await page
      .locator("li.book-type >> nth=0 >> .cover + div")
      .boundingBox();
    if (coverBox === null || textBox === null) {
      throw new Error("missing cover or text box");
    }
    if (locale === "en") {
      expect(coverBox.x).toBeLessThan(textBox.x);
    } else {
      expect(coverBox.x).toBeGreaterThan(textBox.x);
    }
  }
});

test("the home page links to the book-types page", async ({ page }) => {
  for (const locale of ["ar", "en"] as const) {
    await page.goto(`/${locale}`);
    const link = page.getByRole("link", {
      name: catalogues[locale].link.bookTypes,
      exact: true,
    });
    await expect(link).toHaveAttribute("href", `/${locale}/book-types`);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/book-types$`));
    await expect(page.locator("h1")).toHaveText(
      catalogues[locale].bookTypes.title,
    );
  }
});

test("neither page scrolls horizontally on a phone, and screenshots are written", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const locale of ["ar", "en"] as const) {
    await page.goto(`/${locale}/book-types`);
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(fits).toBe(true);
  }

  await shot(page, "/ar/book-types", 1280, 900, "ar-book-types-desktop");
  await shot(page, "/ar/book-types", 390, 844, "ar-book-types-phone");
  await shot(page, "/en/book-types", 1280, 900, "en-book-types-desktop");
  await shot(page, "/en/book-types", 390, 844, "en-book-types-phone");
});

test("book-types responses set no cookie and load no outside script", async ({
  page,
  request,
}) => {
  for (const locale of ["ar", "en"] as const) {
    const response = await request.get(`/${locale}/book-types`);
    expect(response.status()).toBe(200);
    expect(response.headers()["set-cookie"]).toBeUndefined();
    await page.goto(`/${locale}/book-types`);
    await expect(page.locator("form")).toHaveCount(0);
    await expect(page.locator("input")).toHaveCount(0);
    const origin = new URL(page.url()).origin;
    const srcs = await page.locator("script[src]").evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("src")),
    );
    for (const src of srcs) {
      expect(src).toBeTruthy();
      expect(new URL(src ?? "", origin).origin).toBe(origin);
    }
  }
});
