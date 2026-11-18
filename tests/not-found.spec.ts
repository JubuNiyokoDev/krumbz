import { expect, test } from "@playwright/test";
import { content, pathFor, watchErrors } from "./support/site";
import type { Locale } from "../src/i18n/config";

/** (b) Unknown URLs answer 404 with the branded page and a way back home. */
const CASES: { locale: Locale; path: string }[] = [
  { locale: "fr", path: "/cette-page-n-existe-pas" },
  { locale: "en", path: "/en/this-page-does-not-exist" },
];

for (const { locale, path } of CASES) {
  test(`404 — ${path}`, async ({ page }) => {
    const errors = watchErrors(page);
    const c = content(locale);
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);

    await expect(page.getByRole("heading", { level: 1, name: c.notFound.title })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    const home = page.getByRole("link", { name: c.notFound.cta });
    await expect(home.first()).toBeVisible();
    await expect(home.first()).toHaveAttribute("href", pathFor("/", locale));

    await home.first().click();
    await expect(page).toHaveURL((url) => url.pathname === pathFor("/", locale));
    // A 404 document request is logged by Chromium as a console error: ignore that one only.
    expect(errors.errors.filter((e) => !/status of 404/.test(e))).toEqual([]);
  });
}
