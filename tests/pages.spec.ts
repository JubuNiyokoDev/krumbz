import { expect, test } from "@playwright/test";
import { ALL_PAGES, SEO_KEY, content, settle, watchErrors } from "./support/site";
import { LOCALE_LABELS } from "../src/i18n/config";

/**
 * (a) Every page, in every active locale: HTTP 200, one <h1>, <title>,
 * meta description, canonical + hreflang, valid share image, no console error.
 */
for (const { href, locale, path } of ALL_PAGES) {
  test(`${path} — page valide (${locale})`, async ({ page, request }) => {
    const errors = watchErrors(page);
    const response = await page.goto(path);
    expect(response?.status(), `HTTP ${path}`).toBe(200);

    const c = content(locale);
    const seo = c.seo.pages[SEO_KEY[href]];

    await expect(page.locator("html")).toHaveAttribute("lang", LOCALE_LABELS[locale].htmlLang);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toBeVisible();
    // The h1 text exists once in the DOM (no visually-hidden duplicate) and has an accessible name.
    const h1 = await page.locator("h1").evaluate((el) => ({ text: (el.textContent ?? "").replace(/\s+/g, " ").trim(), label: el.getAttribute("aria-label") }));
    const name = h1.label ?? h1.text;
    expect(name.length, "nom accessible du h1").toBeGreaterThan(0);
    expect(h1.text.split(name).length - 1, "texte du h1 en un seul exemplaire").toBeLessThanOrEqual(1);

    // Missing information is never shown to the public.
    expect(await page.locator("body").innerText(), "« À COMPLÉTER » visible").not.toContain("COMPLÉTER");

    const expectedTitle = href === "/" ? seo.title : c.seo.titleTemplate.replace("%s", seo.title);
    await expect(page).toHaveTitle(expectedTitle);

    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveCount(1);
    await expect(description).toHaveAttribute("content", seo.description);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    expect(new URL((await canonical.getAttribute("href"))!).pathname).toBe(path);

    // hreflang alternates: one per active locale + x-default.
    const alternates = page.locator('link[rel="alternate"][hreflang]');
    expect(await alternates.count()).toBeGreaterThanOrEqual(ALL_PAGES.filter((p) => p.href === href).length + 1);

    // The Open Graph image must exist (real file or generated fallback).
    const ogImage = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    expect(ogImage, "og:image").toBeTruthy();
    const og = await request.get(new URL(ogImage!).pathname + new URL(ogImage!).search);
    expect(og.status(), `og:image ${ogImage}`).toBe(200);
    expect(og.headers()["content-type"]).toMatch(/^image\//);

    // JSON-LD must be valid JSON and never leak a « À COMPLÉTER » value.
    for (const script of await page.locator('script[type="application/ld+json"]').allTextContents()) {
      expect(() => JSON.parse(script)).not.toThrow();
      expect(script).not.toContain("COMPLÉTER");
    }

    await settle(page);
    errors.assertNone();
  });
}

test("sitemap.xml et robots.txt", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toMatch(/Sitemap: .*\/sitemap\.xml/);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  for (const { path } of ALL_PAGES) {
    expect(xml, `sitemap: ${path}`).toMatch(new RegExp(`<loc>https?://[^<]+${path === "/" ? "/" : path}</loc>`));
  }
  expect(xml).toContain('hreflang="x-default"');
});

test("icônes du site", async ({ page, request }) => {
  await page.goto("/");
  for (const rel of ["icon", "apple-touch-icon"]) {
    const hrefs = await page.locator(`link[rel="${rel}"]`).evaluateAll((els) => els.map((e) => e.getAttribute("href")));
    expect(hrefs.length, `<link rel="${rel}">`).toBeGreaterThan(0);
    for (const href of hrefs) expect((await request.get(href!)).status(), href!).toBe(200);
  }
});
