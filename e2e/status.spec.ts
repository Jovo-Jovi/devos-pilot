import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();

test.use({ timezoneId: "America/Los_Angeles" });

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

type Catalogue = {
  days: Record<string, string>;
  list: { and: string };
  status: { openUntil: string; closedOpens: string };
  today: { label: string; closed: string };
};

function catalogue(locale: "ar" | "en"): Catalogue {
  return readJson(`src/i18n/messages/${locale}.json`) as Catalogue;
}

function applyTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{([a-z]+)\}/g, (whole, name: string) => values[name] ?? whole);
}

const locales = ["ar", "en"] as const;

test("server HTML carries no time-dependent markup", async ({ page }) => {
  for (const locale of locales) {
    const response = await page.request.get(`/${locale}`);
    const body = await response.text();
    expect(body).not.toContain("status-chip");
    expect(body).not.toContain("is-today");
    expect(body).not.toContain('class="today"');
  }
});

test("open on Saturday morning: chip, today line and one highlighted row", async ({ page }) => {
  for (const locale of locales) {
    const messages = catalogue(locale);
    await page.clock.setFixedTime(new Date("2026-01-10T08:00:00Z"));
    await page.goto(`/${locale}`);
    const chip = page.locator(".status-chip");
    await expect(chip).toHaveText(applyTemplate(messages.status.openUntil, { time: "14:00" }));
    await expect(chip).not.toHaveClass(/\bis-closed\b/);
    const todayText = `${applyTemplate(messages.today.label, { day: messages.days["6"] })} 09:00–14:00${messages.list.and}17:00–21:00`;
    await expect(page.locator(".today")).toHaveText(todayText);
    await expect(page.locator(".row.is-today")).toHaveCount(1);
    await expect(page.locator(".timetable .row").nth(0)).toHaveClass(/\bis-today\b/);
  }
});

test("closed states and the closed Friday", async ({ page }) => {
  for (const locale of locales) {
    const messages = catalogue(locale);
    await page.clock.setFixedTime(new Date("2026-01-10T13:00:00Z"));
    await page.goto(`/${locale}`);
    const chip = page.locator(".status-chip");
    await expect(chip).toHaveClass(/\bis-closed\b/);
    await expect(chip).toHaveText(
      applyTemplate(messages.status.closedOpens, { day: messages.days["6"], time: "17:00" }),
    );

    await page.clock.setFixedTime(new Date("2026-01-09T10:00:00Z"));
    await page.goto(`/${locale}`);
    await expect(chip).toHaveClass(/\bis-closed\b/);
    await expect(chip).toHaveText(
      applyTemplate(messages.status.closedOpens, { day: messages.days["6"], time: "09:00" }),
    );
    await expect(page.locator(".today")).toHaveText(
      applyTemplate(messages.today.closed, { day: messages.days["5"] }),
    );
    await expect(page.locator(".row.is-today")).toHaveCount(1);
    const last = page.locator(".timetable .row").last();
    await expect(last).toHaveClass(/\bis-today\b/);
    await expect(last.locator(".closed-label")).toHaveCount(1);
  }
});

test("phone: chip and today line fit without horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const locale of locales) {
    await page.clock.setFixedTime(new Date("2026-01-10T08:00:00Z"));
    await page.goto(`/${locale}`);
    await expect(page.locator(".status-chip")).toBeVisible();
    await expect(page.locator(".today")).toBeVisible();
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(fits).toBe(true);
  }
});
