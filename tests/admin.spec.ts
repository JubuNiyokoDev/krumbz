import { expect, test, type Page } from "@playwright/test";
import { eq, like } from "drizzle-orm";
import { closeDb, getDb } from "../src/lib/db/client.ts";
import { FEATURE_KEYS } from "../src/lib/db/mappers.ts";
import { subscriptions, tenantFeatures, tenants, users } from "../src/lib/db/schema.ts";
import { hashPassword } from "../src/lib/db/users.ts";
import { starterContent } from "../src/lib/admin/content.ts";
import { DEFAULT_THEME } from "../src/lib/admin/theme.ts";
import { getOfferSettings, OFFER_KEY, writeSetting, type OfferSettings } from "../src/lib/platform/settings.ts";
import type { TenantContact } from "../src/lib/tenant/types.ts";

/**
 * Super-admin end-to-end: login, dashboard, shop creation with WhatsApp credentials,
 * vendor password reset, offer settings, health and audit journal.
 * Each Playwright worker gets its own super-admin and its own demo shop.
 *
 *   PW_BASE_URL=http://localhost:3350 PW_TENANT=admin npm run test:e2e -- tests/admin.spec.ts
 */
const password = "mot-de-passe-e2e-2026";
const contact: TenantContact = { whatsapp: "25768000001", phones: [], email: null, address: null, city: null, hours: null, mapUrl: null, socials: [] };
let email = "";
let vendorSlug = "";
let vendorIdentifier = "";
let vendorTenantId = "";
let adminId = "";
let createdSlug = "";
let originalOffer: OfferSettings | null = null;

test.beforeAll(async () => {
  const suffix = `e2e${test.info().workerIndex}`;
  email = `admin-${suffix}@example.test`;
  vendorSlug = `adm-${suffix}`;
  vendorIdentifier = `${vendorSlug}@example.test`;
  const db = getDb();
  originalOffer = await getOfferSettings(db);
  await db.delete(tenants).where(like(tenants.slug, `new-${test.info().workerIndex}-%`));
  await db.delete(tenants).where(eq(tenants.slug, vendorSlug));
  await db.delete(users).where(eq(users.email, email));

  const [tenant] = await db
    .insert(tenants)
    .values({
      slug: vendorSlug,
      name: `Boutique ${suffix}`,
      status: "active",
      template: "vitrine",
      locales: ["fr"],
      theme: DEFAULT_THEME,
      contact,
      content: starterContent(`Boutique ${suffix}`),
      scenes: [],
    })
    .returning({ id: tenants.id });
  vendorTenantId = tenant.id;
  await db.insert(tenantFeatures).values(FEATURE_KEYS.map((key) => ({ tenantId: vendorTenantId, key, enabled: true })));
  await db.insert(subscriptions).values({ tenantId: vendorTenantId, plan: "actif", status: "active", endsAt: null, priceBif: 0 });
  await db.insert(users).values({ email: vendorIdentifier, passwordHash: await hashPassword("temporaire-e2e-2026"), role: "vendor", tenantId: vendorTenantId, name: "Vendeur E2E", mustChangePassword: true });

  const [admin] = await db
    .insert(users)
    .values({ email, passwordHash: await hashPassword(password), role: "superadmin", tenantId: null, name: "Admin E2E", mustChangePassword: false })
    .returning({ id: users.id });
  adminId = admin.id;
  await closeDb();
});

test.afterAll(async () => {
  const db = getDb();
  if (vendorTenantId) await db.delete(tenants).where(eq(tenants.id, vendorTenantId));
  if (createdSlug) await db.delete(tenants).where(eq(tenants.slug, createdSlug));
  if (adminId) await db.delete(users).where(eq(users.id, adminId));
  if (originalOffer) await writeSetting(db, OFFER_KEY, originalOffer);
  await closeDb();
});

async function login(page: Page) {
  await page.goto("/connexion");
  await page.locator('input[name="identifier"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/(?:$|\?)/);
}

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "pas de débordement horizontal").toBeLessThanOrEqual(1);
}

test("connexion, tableau de bord et navigation", async ({ page }) => {
  const errors = watchErrors(page);
  await login(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Bonjour, Admin E2E");
  const menu = page.getByRole("navigation", { name: "Navigation principale" });
  const menuButton = page.getByRole("button", { name: "Menu" });
  if (await menuButton.isVisible()) await menuButton.click();
  await expect(menu.getByRole("link", { name: "Vendeurs" })).toBeVisible();
  for (const path of ["/vendeurs", "/paiements", "/statistiques", "/reglages", "/sante", "/journal"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await noOverflow(page);
  }
  expect(errors).toEqual([]);
});

test("créer une boutique affiche les identifiants et le lien WhatsApp prérempli", async ({ page }) => {
  const errors = watchErrors(page);
  await login(page);
  await page.goto("/vendeurs");
  createdSlug = `new-${test.info().workerIndex}-${Date.now().toString().slice(-6)}`;
  await page.locator('input[name="name"]').fill("Boutique créée par test");
  await page.locator('input[name="slug"]').fill(createdSlug);
  await page.locator('input[name="identifier"]').fill(`${createdSlug}@example.test`);
  await page.locator('input[name="whatsapp"]').fill("25768000002");
  await page.getByRole("button", { name: "Créer la boutique et afficher les accès" }).click();

  const credentials = page.getByTestId("credentials");
  await expect(credentials).toBeVisible();
  await expect(page.getByTestId("credentials-identifier")).toHaveText(`${createdSlug}@example.test`);
  const temporaryPassword = await page.getByTestId("credentials-password").textContent();
  expect(temporaryPassword?.length ?? 0).toBeGreaterThanOrEqual(10);
  const href = await page.getByTestId("whatsapp-link").getAttribute("href");
  expect(href).toMatch(/^https:\/\/wa\.me\/25768000002\?text=/);
  expect(decodeURIComponent(href ?? "")).toContain(`${createdSlug}@example.test`);
  expect(decodeURIComponent(href ?? "")).toContain(temporaryPassword ?? "");
  await expect(page.getByRole("link", { name: "Boutique créée par test" }).first()).toBeVisible();
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("réinitialiser le mot de passe d'un vendeur envoie de nouveaux accès par WhatsApp", async ({ page }) => {
  const errors = watchErrors(page);
  await login(page);
  await page.goto(`/vendeurs/${vendorTenantId}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(`Boutique e2e${test.info().workerIndex}`);
  await page.locator("summary").filter({ hasText: "Comptes vendeurs" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Réinitialiser le mot de passe" }).click();
  await expect(page.getByTestId("credentials")).toBeVisible();
  await expect(page.getByTestId("credentials-identifier")).toHaveText(vendorIdentifier);
  const resetPassword = await page.getByTestId("credentials-password").textContent();
  expect(resetPassword?.length ?? 0).toBeGreaterThanOrEqual(10);
  const href = await page.getByTestId("whatsapp-link").getAttribute("href");
  expect(href).toMatch(/^https:\/\/wa\.me\/25768000001\?text=/);
  expect(decodeURIComponent(href ?? "")).toContain(resetPassword ?? "");
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("réglages : tarifs enregistrés et action journalisée", async ({ page }) => {
  const errors = watchErrors(page);
  await login(page);
  await page.goto("/reglages");
  await page.locator('input[name="monthlyPriceBif"]').fill("12500");
  await page.getByRole("button", { name: "Enregistrer l'offre" }).click();
  await expect(page.getByText("Offre et tarifs enregistrés.")).toBeVisible();
  await page.goto("/journal");
  await expect(page.getByText("Offre modifiée").first()).toBeVisible();
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("santé et statistiques s'affichent même sans rapport hôte", async ({ page }) => {
  const errors = watchErrors(page);
  await login(page);
  await page.goto("/sante");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Santé du serveur");
  await expect(page.getByRole("status").or(page.getByText("État général")).first()).toBeVisible();
  await page.goto("/statistiques");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Statistiques");
  await noOverflow(page);
  expect(errors).toEqual([]);
});
