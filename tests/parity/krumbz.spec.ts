import { expect, test, type Page } from "@playwright/test";

/**
 * Krumbz must look strictly identical before/after the multi-vendor migration.
 * Static render mode + reduced motion → deterministic pages (no WebGL, no scroll
 * animations). Every page is scrolled to the end first so lazy images load.
 *
 * Paths are listed explicitly (not read from src/) so the reference does not
 * change when the routing code is refactored.
 */
const PAGES: Record<string, string[]> = {
  fr: ["/", "/produits", "/notre-histoire", "/commander", "/contact", "/mentions-legales"],
  en: ["/en", "/en/products", "/en/our-story", "/en/order", "/en/contact", "/en/legal-notice"],
  rn: ["/rn"],
  sw: ["/sw"],
};

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const step = Math.max(400, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    // Lazy images loaded and fully decoded (not the blur placeholder).
    await Promise.all(
      Array.from(document.images).map((img) => (img.loading === "lazy" ? (img.loading = "eager") : null)),
    );
    await Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map((img) => new Promise((r) => { img.addEventListener("load", r, { once: true }); img.addEventListener("error", r, { once: true }); setTimeout(r, 8000); })),
    );
    await Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => undefined)));
  });
  // Local storage (cart) must not leak between runs.
  await page.evaluate(() => localStorage.clear());
  await page.waitForTimeout(600);
}

for (const [locale, paths] of Object.entries(PAGES)) {
  for (const path of paths) {
    const name = `${locale}${path === "/" ? "-accueil" : path.replace(/\//g, "-")}`.replace(/--+/g, "-");
    test(`parité Krumbz ${name}`, async ({ page }) => {
      await page.goto(`${path}${path.includes("?") ? "&" : "?"}mode=static`);
      await settle(page);
      await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, timeout: 60_000 });
    });
  }
}
