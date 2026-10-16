import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  outputDir: "./test-results",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3200",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
      testIgnore: /(staff-(notices|hours|zone|book-types)|book-types-flow)\.spec\.ts/,
    },
    {
      name: "editor",
      use: { browserName: "chromium" },
      testMatch: /(staff-(notices|hours|zone|book-types)|book-types-flow)\.spec\.ts/,
      dependencies: ["chromium"],
      workers: 1,
    },
  ],
  webServer: {
    command: "pnpm exec next start -p 3200",
    url: "http://127.0.0.1:3200/ar",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
