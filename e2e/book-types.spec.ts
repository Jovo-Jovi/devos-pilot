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
  await expect(page.locator("ol.book-types li.book-type")).toHaveCount(bookTypes.length);
  await expect(page.locator("ol.book-types .cover").first()).toBeVisible();
  const coverImage = page.locator("ol.book-types img");
  await expect(coverImage).toHaveCount(1);
  await expect
    .poll(async () =>
      coverImage.evaluate((node) => {
        const picture = node as HTMLImageElement;
        return picture.complete && picture.naturalWidth > 0;
      }),
    )
    .toBe(true);
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

test("one cover and four placeholders", async ({ page }) => {
  const novels = bookTypes.find((row) => row.id === "novels");
  if (!novels) throw new Error("firebase seed has no novels book type");
  const publicBase = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (!publicBase) throw new Error("R2_PUBLIC_BASE_URL is not set");
  for (const locale of ["en", "ar"] as const) {
    await page.goto(`/${locale}/book-types`);
    const covers = page.locator("ol.book-types .cover");
    await expect(covers).toHaveCount(bookTypes.length);
    for (let index = 0; index < bookTypes.length; index += 1) {
      await expect(covers.nth(index)).toHaveAttribute("aria-hidden", "true");
    }
    const novelsName = locale === "ar" ? novels.nameAr : novels.nameEn;
    const novelsEntry = page.locator("li.book-type", {
      has: page.locator("h2", { hasText: novelsName }),
    });
    await expect(novelsEntry.locator("h2")).toHaveText(novelsName);
    const image = novelsEntry.locator("img");
    await expect(page.locator("ol.book-types img")).toHaveCount(1);
    await expect(image).toHaveCount(1);
    await expect(image).toHaveAttribute("alt", "");
    const src = await image.getAttribute("src");
    expect(src?.startsWith(`${publicBase}/book-types/novels/`)).toBe(true);
    expect(src?.endsWith(".webp")).toBe(true);
    await expect
      .poll(async () =>
        image.evaluate((node) => {
          const picture = node as HTMLImageElement;
          return picture.complete && picture.naturalWidth > 0;
        }),
      )
      .toBe(true);
    const entry = page.locator("li.book-type").first();
    const cover = entry.locator(".cover");
    const text = entry.locator(":scope > div");
    await expect(cover).toBeVisible();
    await expect(text).toBeVisible();
    const coverBox = await cover.boundingBox();
    const textBox = await text.boundingBox();
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
    await expect(page.locator("h1.page-title")).toHaveText(
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

test("public and staff responses admit the bucket on img-src and the cover is webp", async ({
  page,
  request,
}) => {
  const publicBase = process.env.R2_PUBLIC_BASE_URL;
  if (!publicBase) throw new Error("R2_PUBLIC_BASE_URL is not set");
  const origin = new URL(publicBase).origin;
  for (const route of ["/ar/book-types", "/en/book-types", "/en/staff/sign-in"]) {
    const response = await request.get(route);
    const policy = response.headers()["content-security-policy"] ?? "";
    expect(policy).toContain(`img-src 'self' data: ${origin};`);
    expect(policy).toContain("connect-src 'self'");
  }
  await page.goto("/ar/book-types");
  const src = await page.locator("ol.book-types img").getAttribute("src");
  expect(src).toBeTruthy();
  const image = await request.get(src ?? "");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/webp");
});
