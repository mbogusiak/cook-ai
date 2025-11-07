import { defineConfig, devices } from "@playwright/test"
import dotenv from "dotenv";
import path from "node:path";
dotenv.config({
  path: path.resolve(process.cwd(), ".env.e2e"),
  override: true
});

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: 1,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "pl-PL",
    timezoneId: "Europe/Warsaw",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "cp .env .env.backup.local && cp .env.e2e .env && npm run build && npm run preview -- --port=3000",
    url: "http://localhost:3000",
    reuseExistingServer: false, // Force rebuild with correct env
    timeout: 120_000,
  },
});
