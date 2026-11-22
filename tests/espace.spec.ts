import { expect, test, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/lib/db/client.ts";
import { FEATURE_KEYS } from "../src/lib/db/mappers.ts";
import { subscriptions, tenantFeatures, tenants, users } from "../src/lib/db/schema.ts";
import { hashPassword } from "../src/lib/db/users.ts";
import type { TenantContact, TenantTheme } from "../src/lib/tenant/types.ts";

/**
 * Vendor space end-to-end: first login (forced password change), product creation,
 * photo upload, contact update and logout. Each Playwright worker gets its own shop.
 *
 *   PW_BASE_URL=http://localhost:3350 PW_TENANT=espace npm run test:e2e -- tests/espace.spec.ts
 */
const temporary = "temporaire-e2e-2026";
const chosen = "mot-de-passe-e2e-2026";
let slug = "";
let identifier = "";
let shopName = "";

const theme: TenantTheme = {
  colors: { background: "#fff", surface: "#f7f5f2", primary: "#1d3f6e", accent: "#d97706", text: "#1c1b1a", muted: "#5b5955" },
  fonts: { display: "Fredoka", body: "Nunito" },
  radius: "soft",
  logoUrl: null,
};
const contact: TenantContact = { whatsapp: "25768000000", phones: [], email: null, address: null, city: null, hours: null, mapUrl: null, socials: [] };

let tenantId = "";

test.beforeAll(async () => {
  const suffix = `e2e${test.info().workerIndex}`;
  slug = `es-${suffix}`;
  identifier = `${slug}@example.test`;
  shopName = `Boutique ${suffix}`;
  const db = getDb();
  await db.delete(tenants).where(eq(tenants.slug, slug));
  const [tenant] = await db
    .insert(tenants)
    .values({ slug, name: shopName, status: "active", template: "vitrine", locales: ["fr"], theme, contact, content: {} })
    .returning({ id: tenants.id });
  tenantId = tenant.id;
  await db.insert(tenantFeatures).values(FEATURE_KEYS.map((key) => ({ tenantId, key, enabled: true })));
  await db.insert(subscriptions).values({ tenantId, plan: "actif", status: "active", endsAt: null, priceBif: 0 });
  await db.insert(users).values({
    email: identifier,
    passwordHash: await hashPassword(temporary),
    role: "vendor",
    tenantId,
    name: "Vendeur E2E",
    mustChangePassword: true,
  });
  await closeDb();
});

test.afterAll(async () => {
  if (!tenantId) return;
  const db = getDb();
  await db.delete(tenants).where(eq(tenants.id, tenantId));
  await closeDb();
});

async function fillProduct(page: Page, name: string) {
  await page.locator('input[name="name.fr"]').fill(name);
  await page.locator('input[name="price"]').fill("25000");
  await page.locator('input[name="visible"]').check();
}

test("connexion, mot de passe, produits, photos, contacts, déconnexion", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/connexion");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Connexion");
  await page.locator('input[name="identifier"]').fill(identifier);
  await page.locator('input[name="password"]').fill(temporary);
  await page.getByTestId("login-form").locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/mot-de-passe$/);
  await expect(page.getByText(/Choisissez votre propre mot de passe/)).toBeVisible();

  await page.locator('input[name="password"]').fill(chosen);
  await page.locator('input[name="confirm"]').fill(chosen);
  await page.getByTestId("password-form").locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\?bienvenue=1$/);
  await expect(page.getByTestId("shop-link")).toBeVisible();

  await page.getByRole("link", { name: "Ajouter un produit", exact: true }).click();
  await expect(page).toHaveURL(/\/produits\/nouveau$/);
  await fillProduct(page, "Chaussure E2E");
  await page.locator('[data-testid="product-form"] button[type="submit"]').click();
  await expect(page).toHaveURL(/\/produits\/[0-9a-f-]+\?cree=1$/);
  const productId = page.url().match(/\/produits\/([0-9a-f-]+)/)?.[1];
  expect(productId).toBeTruthy();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Modifier le produit");

  // A tiny PNG is enough: the server resizes it and records the WebP variants.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
    "base64",
  );
  await page.locator('[data-testid="photos-form"] input[type="file"]').setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: png });
  await page.locator('[data-testid="photos-form"] button[type="submit"]').click();
  await expect(page.getByTestId("product-image")).toHaveCount(1);
  await expect(page.getByTestId("product-image")).toContainText("Photo principale");

  await page.getByRole("link", { name: "Contacts" }).click();
  await expect(page).toHaveURL(/\/contacts$/);
  await page.locator('input[name="whatsapp"]').fill("257 68 00 00 00");
  await page.locator('input[name="city"]').fill("Bujumbura");
  await page.locator('[data-testid="contacts-form"] button[type="submit"]').click();
  await expect(page.getByText("Contacts enregistrés")).toBeVisible();
  await page.reload();
  await expect(page.locator('input[name="whatsapp"]')).toHaveValue("25768000000");
  await expect(page.locator('input[name="city"]')).toHaveValue("Bujumbura");

  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/connexion$/);
  expect(errors, "erreurs console").toEqual([]);
});
