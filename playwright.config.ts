import fs from "node:fs";
import { chromium, defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the production build.
 *
 *   npm run build && npm run test:e2e
 *   npm run test:e2e -- --project=desktop      (one project)
 *   npm run test:e2e -- tests/order.spec.ts    (one file)
 *
 * The web server is `next start -p 3200` (it needs a prior `npm run build`).
 * Browser: Playwright's Chromium when installed (`npx playwright install chromium`),
 * otherwise the system Google Chrome (channel "chrome").
 */
const PORT = 3200;
// PW_BASE_URL=http://localhost:3000 runs the suite against an already running server (e.g. `npm run dev`).
const externalURL = process.env.PW_BASE_URL;
const baseURL = externalURL ?? `http://localhost:${PORT}`;
const channel = fs.existsSync(chromium.executablePath()) ? undefined : "chrome";

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    locale: "fr-FR",
    timezoneId: "Africa/Bujumbura",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // SwiftShader keeps WebGL available in headless mode (3D layer).
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel, viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        browserName: "chromium",
        channel,
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: externalURL
    ? undefined
    : {
    command: `npm run start -- -p ${PORT}`,
    url: `${baseURL}/robots.txt`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
