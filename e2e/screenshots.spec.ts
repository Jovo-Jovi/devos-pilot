import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "@playwright/test";

const root = process.cwd();

test("screenshots of home and notices in both locales", async ({ page }) => {
  const shots = [
    ["/ar", ".devos/screenshots/ar-home.png"],
    ["/ar/notices", ".devos/screenshots/ar-notices.png"],
    ["/en", ".devos/screenshots/en-home.png"],
    ["/en/notices", ".devos/screenshots/en-notices.png"],
  ] as const;

  for (const [route, relativePath] of shots) {
    const path = join(root, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    await page.goto(route, { waitUntil: "load" });
    await page.screenshot({ path, fullPage: true });
  }
});
