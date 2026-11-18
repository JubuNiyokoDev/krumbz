import { expect, test } from "@playwright/test";
import { content, openMenuIfCollapsed, pathFor, settle, watchErrors } from "./support/site";
import { LOCALE_LABELS } from "../src/i18n/config";

/** (e) prefers-reduced-motion: no WebGL at all, static images/placeholders instead. */
test("mouvement réduit : pas de <canvas>, visuels statiques", async ({ page }) => {
  const errors = watchErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(pathFor("/", "fr"));
  await settle(page);

  await expect(page.locator("canvas")).toHaveCount(0);
  const stages = page.locator("[data-stage]");
  expect(await stages.count(), "sections [data-stage] de l'accueil").toBeGreaterThan(0);
  await expect(stages.first()).toBeVisible();

  // Each stage shows a still picture or a labelled placeholder.
  const stills = page.locator("[data-stage] img, [data-stage] [data-placeholder], [data-stage-anchor] img, [data-stage-anchor] [data-placeholder]");
  expect(await stills.count(), "images ou emplacements statiques").toBeGreaterThan(0);
  await expect(stills.first()).toBeVisible();
  errors.assertNone();
});

/** (f) The language switcher keeps the current page: /produits → /en/products. */
test("changement de langue fr → en sur la même page", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(pathFor("/produits", "fr"));
  await openMenuIfCollapsed(page, "fr");

  const en = LOCALE_LABELS.en;
  const switcher = page.getByRole("link", { name: new RegExp(`^(${en.long}|${en.short})$`, "i") }).first();
  await switcher.click();

  await expect(page).toHaveURL((url) => url.pathname === pathFor("/produits", "en"));
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(content("en").products.title);
  errors.assertNone();
});

/** (g) Keyboard: the first Tab reaches the skip link, which moves focus to <main id="contenu">. */
test("clavier : lien d’évitement en premier", async ({ page }) => {
  const c = content("fr");
  await page.goto(pathFor("/", "fr"));
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: c.nav.skipToContent });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("#contenu")).toBeFocused();
});
