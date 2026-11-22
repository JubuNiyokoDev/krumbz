import { test } from "@playwright/test";
import { ALL_PAGES, settle } from "./support/site";

/**
 * (h) Full-page screenshots of every page, per project (desktop / mobile),
 * saved under test-results/ and attached to the HTML report.
 * Visual review only: nothing is asserted.
 */
test.describe("captures d’écran", () => {
  for (const { path, locale, href } of ALL_PAGES) {
    test(`capture ${path}`, async ({ page }, testInfo) => {
      // Full-page mobile captures of long, animation-heavy pages are slow in headless CI.
      const timeout = href === "/" ? 240_000 : testInfo.project.name === "mobile" ? 120_000 : 45_000;
      test.setTimeout(timeout);
      await page.goto(path);
      await settle(page, 10_000);
      await page.evaluate(() => document.fonts.ready);
      // Let entrance animations finish.
      await page.waitForTimeout(800);
      const name = `${locale}-${href === "/" ? "accueil" : href.slice(1)}-${testInfo.project.name}.png`;
      const file = testInfo.outputPath(name);
      await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
      await testInfo.attach(name, { path: file, contentType: "image/png" });
    });
  }
});
