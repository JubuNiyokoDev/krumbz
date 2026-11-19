import { expect, test, type Page } from "@playwright/test";
import { content, escapeRegExp, icu, pathFor, seedCart, watchErrors } from "./support/site";

/**
 * (d) Order form: validation errors on an empty submit, then a valid order
 * produces a wa.me link carrying the order lines and the customer.
 * WhatsApp is never opened: every request to wa.me (same tab or popup) is
 * intercepted and answered locally.
 */
const c = content("fr");
const form = c.order.form;
const WHATSAPP = c.contact.whatsapp.number;

/** Field by its visible label; labels may carry a « obligatoire » marker. */
const field = (page: Page, label: string) => page.getByLabel(new RegExp(`^\\s*${escapeRegExp(label)}`)).first();

async function captureWhatsApp(page: Page) {
  const urls: string[] = [];
  await page.context().route("https://wa.me/**", (route) => {
    urls.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "text/html", body: "<title>wa.me (intercepté)</title>" });
  });
  return urls;
}

test("formulaire vide : erreurs affichées", async ({ page }) => {
  const errors = watchErrors(page);
  const urls = await captureWhatsApp(page);
  await page.goto(pathFor("/commander", "fr"));

  await page.getByRole("button", { name: form.submit }).click();

  for (const message of [form.errors.name, form.errors.phone, form.errors.city, form.errors.district, form.errors.cart]) {
    await expect(page.getByText(message).first()).toBeVisible();
  }
  await expect(page.getByText(icu(form.errors.summary, { count: 5 }, "fr")).first()).toBeVisible();
  // Invalid fields are announced to assistive technologies.
  await expect(field(page, form.name)).toHaveAttribute("aria-invalid", "true");
  expect(urls).toEqual([]);
  errors.assertNone();
});

test("commande valide : lien WhatsApp avec produits et client", async ({ page }) => {
  const errors = watchErrors(page);
  const urls = await captureWhatsApp(page);
  const product = c.products.items[0];
  await seedCart(page, [{ id: product.id, quantity: 2 }]);
  await page.goto(pathFor("/commander", "fr"));

  await field(page, form.name).fill("Aline Niyonzima");
  await field(page, form.phone).fill("62 697 087");
  await field(page, form.city).fill("Bujumbura");
  await field(page, form.district).fill("Rohero");
  await page.getByRole("button", { name: form.submit }).click();

  await expect.poll(() => urls.length, { message: "aucune requête vers wa.me" }).toBeGreaterThan(0);
  const url = new URL(urls[0]);
  expect(url.hostname).toBe("wa.me");
  expect(url.pathname).toBe(`/${WHATSAPP}`);
  expect(WHATSAPP).toBe("25768497372");

  const text = url.searchParams.get("text") ?? "";
  expect(text).toContain(icu(c.order.whatsapp.line, { quantity: 2, name: product.name }, "fr"));
  expect(text).toContain(icu(c.order.whatsapp.customer, { name: "Aline Niyonzima" }, "fr"));
  expect(text).toContain(icu(c.order.whatsapp.phone, { phone: "+257 62 697 087" }, "fr"));
  expect(text).toContain(icu(c.order.whatsapp.address, { district: "Rohero", city: "Bujumbura" }, "fr"));
  expect(text).not.toContain("COMPLÉTER");
  errors.assertNone();
});
