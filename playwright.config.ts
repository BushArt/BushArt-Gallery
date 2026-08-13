import { defineConfig, devices } from "@playwright/test";
import { loadEnvLocal } from "./tests/e2e/load-env";

const localEnv = loadEnvLocal();

const e2eEnv: Record<string, string> = {
  ...process.env,
  ...localEnv,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME:
    localEnv.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ??
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ??
    localEnv.CLOUDINARY_CLOUD_NAME ??
    "test-cloud",
  CLOUDINARY_CLOUD_NAME:
    localEnv.CLOUDINARY_CLOUD_NAME ??
    process.env.CLOUDINARY_CLOUD_NAME ??
    "test-cloud",
  NEXT_PUBLIC_SITE_URL:
    localEnv.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 180_000,
    env: e2eEnv,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
