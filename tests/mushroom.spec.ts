import { expect, test } from "@playwright/test";
import { content, LOCALES, pathFor } from "./support/site";

/**
 * The mushroom (ikizinu) is the base ingredient and the central message:
 * shown first on the Products page in every language, illustrated on the home
 * and story pages with lazy-loaded photos. The slogan is printed on the carton only.
 */

for (const locale of LOCALES) {
  test(`produits — ingrédient de base « ikizinu » en premier (${locale})`, async ({ page }) => {
    const ing = content(locale).products.ingredients;
    await page.goto(pathFor("/produits", locale));
    const facts = page.locator("article").filter({ hasText: ing.baseTitle });
    await expect(facts).toBeVisible();
    await expect(facts).toContainText(ing.base);
    await expect(facts).toContainText("izinu");
    await expect(facts).toContainText(ing.othersTitle);
    // Base ingredient is listed before the label's other ingredients.
    // (innerText follows CSS text-transform: compare case-insensitively)
    const text = (await facts.innerText()).toLocaleLowerCase();
    const base = text.indexOf(ing.base.toLocaleLowerCase());
    const others = text.indexOf(ing.othersTitle.toLocaleLowerCase());
    expect(base).toBeGreaterThan(-1);
    expect(others).toBeGreaterThan(-1);
    expect(base).toBeLessThan(others);
    await expect(facts.locator('img[src*="champignons-gros-plan"]')).toHaveCount(1);
  });
}

test("accueil — photos du champignon présentes et chargées à la demande", async ({ page }) => {
  await page.goto("/");
  const photos = page.locator('main img[src*="champignon"], main img[srcset*="champignon"]');
  // « Du champignon au biscuit » + 2 rappels entre les moments + 2 photos de la section champignon.
  expect(await photos.count()).toBeGreaterThanOrEqual(5);
  for (const loading of await photos.evaluateAll((imgs) => imgs.map((img) => img.getAttribute("loading")))) {
    expect(loading).toBe("lazy");
  }
  await expect(page.locator("[data-mushroom-break]")).toHaveCount(2);
  // Section order: intro → « Du champignon au biscuit » → moments.
  const order = await page.evaluate(() => {
    const from = document.getElementById("from-mushroom-title")!.getBoundingClientRect().top;
    const moments = document.getElementById("moments")!.getBoundingClientRect().top;
    const hero = document.getElementById("hero-title")!.getBoundingClientRect().top;
    return hero < from && from < moments;
  });
  expect(order).toBe(true);
});

test("notre histoire — récit « De la forêt du Burundi à votre sachet » illustré", async ({ page }) => {
  const journey = content("fr").story.journey;
  await page.goto("/notre-histoire");
  const section = page.locator("section").filter({ has: page.getByRole("heading", { name: journey.title }) });
  await expect(section).toBeVisible();
  await expect(section.locator("img")).toHaveCount(3);
});

test("le slogan est sur le carton, pas sur le sachet", async ({ page }) => {
  const c = content("fr");
  await page.goto("/produits");
  const sachet = page.locator("#produit-sachet");
  const carton = page.locator("#produit-carton");
  await expect(sachet).toBeVisible();
  expect((await sachet.innerText()).toUpperCase()).not.toContain(c.brand.tagline.toUpperCase());
  expect((await carton.textContent())!.toUpperCase()).toContain(c.brand.tagline.toUpperCase());
});
