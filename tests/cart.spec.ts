import { expect, test } from "@playwright/test";
import { content, escapeRegExp, icu, pathFor, watchErrors } from "./support/site";

/**
 * (c) Cart: "Ajouter au panier" adds a product, the header cart button
 * (aria-label nav.openCart) shows the new count, and the cart survives a reload.
 */
test("ajout au panier, compteur et persistance", async ({ page }) => {
  const errors = watchErrors(page);
  const c = content("fr");
  const cartLabel = (count: number) => icu(c.nav.openCart, { count }, "fr");

  await page.goto(pathFor("/produits", "fr"));
  await expect(page.getByLabel(cartLabel(0), { exact: true }).first()).toBeVisible();

  // Accessible name starts with « Ajouter au panier » (it may name the product too).
  const add = page.getByRole("button", { name: new RegExp(`^${escapeRegExp(c.common.addToCart)}`) }).first();
  await add.scrollIntoViewIfNeeded();
  await add.click();
  await expect(page.getByLabel(cartLabel(1), { exact: true }).first()).toBeVisible();

  await add.click();
  await expect(page.getByLabel(cartLabel(2), { exact: true }).first()).toBeVisible();

  const stored = await page.evaluate(() => window.localStorage.getItem("krumbz-cart"));
  expect(JSON.parse(stored ?? "{}").state?.lines?.[0]?.quantity).toBe(2);

  await page.reload();
  await expect(page.getByLabel(cartLabel(2), { exact: true }).first()).toBeVisible();
  errors.assertNone();
});
