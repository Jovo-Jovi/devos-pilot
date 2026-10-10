import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

type Catalogue = {
  days: Record<string, string>;
  state: { closed: string };
  timetable: { label: string };
};

function catalogue(locale: "ar" | "en"): Catalogue {
  return readJson(`src/i18n/messages/${locale}.json`) as Catalogue;
}

const slots = readJson("content/opening-slots.json") as unknown[];

test("timetable has one row per day, Saturday first, and a closed Friday", async ({
  page,
}) => {
  for (const locale of ["ar", "en"] as const) {
    const messages = catalogue(locale);
    await page.goto(`/${locale}`);
    const rows = page.locator(".timetable .row");
    await expect(rows).toHaveCount(7);
    const dayText = await rows.first().locator(".day").innerText();
    expect(dayText.startsWith(messages.days["6"])).toBe(true);
    await expect(rows.last().locator(".times .closed-label")).toHaveText(
      messages.state.closed,
    );
    await expect(page.locator(".bar")).toHaveCount(slots.length);
    await expect(
      page.getByRole("group", { name: messages.timetable.label }),
    ).toHaveCount(1);
  }
});

test("a bar is mirrored between ar and en", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });

  async function offsetFromStart(locale: "ar" | "en"): Promise<number> {
    await page.goto(`/${locale}`);
    const row = page.locator(".timetable .row").first();
    const trackBox = await row.locator(".track").boundingBox();
    const barBox = await row.locator(".bar").first().boundingBox();
    expect(trackBox).not.toBeNull();
    expect(barBox).not.toBeNull();
    if (trackBox === null || barBox === null) {
      throw new Error("missing timetable box");
    }
    if (locale === "en") {
      return barBox.x - trackBox.x;
    }
    return trackBox.x + trackBox.width - (barBox.x + barBox.width);
  }

  const english = await offsetFromStart("en");
  const arabic = await offsetFromStart("ar");
  expect(Math.abs(english - arabic)).toBeLessThanOrEqual(2);
  expect(english).toBeGreaterThan(0);
  expect(arabic).toBeGreaterThan(0);
});

test("phone timetable stacks and does not scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const locale of ["ar", "en"] as const) {
    await page.goto(`/${locale}`);
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(fits).toBe(true);
    await expect(page.locator(".axis > :first-child")).toBeHidden();
    const row = page.locator(".timetable .row").first();
    const dayBox = await row.locator(".day").boundingBox();
    const trackBox = await row.locator(".track").boundingBox();
    expect(dayBox).not.toBeNull();
    expect(trackBox).not.toBeNull();
    if (dayBox === null || trackBox === null) {
      throw new Error("missing timetable box");
    }
    expect(trackBox.y).toBeGreaterThan(dayBox.y);
  }
});
