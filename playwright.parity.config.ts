import fs from "node:fs";
import path from "node:path";
import { chromium, defineConfig, devices } from "@playwright/test";

/**
 * Visual parity of Krumbz (multi-vendor migration, docs/plan.md step 0/2).
 *
 *   Record the reference ("before"), on the pre-migration build:
 *     PW_BASE_URL=http://localhost:3310 npx playwright test -c playwright.parity.config.ts --update-snapshots
 *   Compare ("after"):
 *     PW_BASE_URL=<url of the migrated Krumbz> npx playwright test -c playwright.parity.config.ts
 *
 * Reference images live outside git (large): PARITY_DIR (default reports/parity).
 * A worktree can point PARITY_DIR at the main checkout's reports/parity.
 */
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
const baseURL = tenantURL(process.env.PW_BASE_URL ?? "http://localhost:3310");
const parityDir = path.resolve(process.env.PARITY_DIR ?? "reports/parity");
const channel = fs.existsSync(chromium.executablePath()) ? undefined : "chrome";

export default defineConfig({
  testDir: "./tests/parity",
  outputDir: "./test-results/parity",
  snapshotPathTemplate: `${parityDir}/{projectName}/{arg}{ext}`,
  fullyParallel: true,
  workers: 2,
  timeout: 180_000,
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: "disabled", caret: "hide" } },
  reporter: [["list"]],
  use: {
    baseURL,
    locale: "fr-FR",
    timezoneId: "Africa/Bujumbura",
    reducedMotion: "reduce",
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel, viewport: { width: 1440, height: 900 } } },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], browserName: "chromium", channel, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    },
  ],
});
