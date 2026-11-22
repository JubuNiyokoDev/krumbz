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
/**
 * Multi-tenant: Krumbz is served on its own host. A localhost base URL is turned
 * into <PW_TENANT>.localhost (default krumbz; Chromium resolves *.localhost to
 * the loopback), so the pages are reached exactly as krumbz.rundinova.com/<path>.
 */
function tenantURL(url: string): string {
  const u = new URL(url);
  if (["localhost", "127.0.0.1"].includes(u.hostname)) u.hostname = `${process.env.PW_TENANT ?? "krumbz"}.localhost`;
  return u.origin;
}
const serverURL = externalURL ?? `http://localhost:${PORT}`;
const baseURL = tenantURL(serverURL);
const channel = fs.existsSync(chromium.executablePath()) ? undefined : "chrome";

export default defineConfig({
  testDir: "./tests",
  // Visual parity has its own config (playwright.parity.config.ts) and reference images.
  testIgnore: ["**/parity/**", "**/isolation/**"],
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
    url: `${serverURL}/robots.txt`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
