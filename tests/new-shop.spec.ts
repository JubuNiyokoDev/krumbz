import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { eq, like } from "drizzle-orm";
import { closeDb, getDb } from "../src/lib/db/client.ts";
import { tenants, users } from "../src/lib/db/schema.ts";
import { hashPassword } from "../src/lib/db/users.ts";
import type { TenantTheme } from "../src/lib/tenant/types.ts";

/**
 * « Nouveau client » end-to-end, from the super-admin UI only: create a shop with its colours, fonts and an
 * SVG logo → its sub-domain storefront exists at once, on the single (Krumbz) template, with its own logo in
 * the header, the 3D loader and the door transition, its own favicon / manifest, and a certificate request.
 *
 *   PW_BASE_URL=http://localhost:3350 PW_TENANT=admin npx playwright test tests/new-shop.spec.ts --project=desktop
 *   (the server and the runner may share CERT_REQUESTS_DIR to also check the certificate request file)
 */
const password = "mot-de-passe-e2e-2026";
const PORT = new URL(process.env.PW_BASE_URL ?? "http://localhost:3000").port || "3000";
let email = "";
let adminId = "";
let slug = "";

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 90" onload="alert(1)"><script>alert(2)</script>
<rect x="6" y="6" width="78" height="78" rx="22" fill="#e5484d"/><circle cx="45" cy="45" r="16" fill="#fff"/>
<text x="100" y="60" font-family="sans-serif" font-size="40" font-weight="700" fill="#1b1b1f">Neuf</text></svg>`;

test.beforeAll(async () => {
  const suffix = `ns${test.info().workerIndex}`;
  email = `admin-${suffix}@example.test`;
  const db = getDb();
  await db.delete(tenants).where(like(tenants.slug, `neuf-${test.info().workerIndex}-%`));
  await db.delete(users).where(eq(users.email, email));
  const [admin] = await db
    .insert(users)
    .values({ email, passwordHash: await hashPassword(password), role: "superadmin", tenantId: null, name: "Admin Nouveau", mustChangePassword: false })
    .returning({ id: users.id });
  adminId = admin.id;
  await closeDb();
});

test.afterAll(async () => {
  const db = getDb();
  if (slug && !process.env.PW_KEEP_VARIANTS) await db.delete(tenants).where(eq(tenants.slug, slug));
  if (adminId) await db.delete(users).where(eq(users.id, adminId));
  await closeDb();
});

test("le super-admin crée une boutique : sous-domaine immédiat, logo, couleurs, polices, favicon", async ({ page, browser }, info) => {
  test.skip(info.project.name !== "desktop", "un seul passage suffit (création en base)");
  test.setTimeout(180_000);

  // 1. Super-admin: login + creation form with the visual identity.
  await page.goto("/connexion");
  await page.locator('input[name="identifier"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/(?:$|\?)/);
  await page.goto("/vendeurs");
  slug = `neuf-${test.info().workerIndex}-${Date.now().toString().slice(-6)}`;
  await page.locator('input[name="name"]').fill("Boutique Neuf");
  await page.locator('input[name="slug"]').fill(slug);
  await page.locator('input[name="identifier"]').fill(`${slug}@example.test`);
  await page.locator('input[name="whatsapp"]').fill("25768000003");
  await page.locator('input[name="color.primary"]').fill("#7a1f5c");
  await page.locator('input[name="color.accent"]').fill("#f2b705");
  await page.locator('input[name="color.background"]').fill("#fff8ef");
  await page.locator('select[name="fontDisplay"]').selectOption("Playfair Display");
  await page.locator('select[name="fontBody"]').selectOption("Lato");
  await page.locator('input[name="logo"]').setInputFiles({ name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from(LOGO_SVG) });
  await page.getByRole("button", { name: "Créer la boutique et afficher les accès" }).click();
  await expect(page.getByTestId("credentials")).toBeVisible({ timeout: 60_000 });

  // 2. Database: theme with the generated brand set, 5 starter scenes, trial status.
  const db = getDb();
  const [row] = await db.select().from(tenants).where(eq(tenants.slug, slug));
  await closeDb();
  expect(row.status).toBe("trial");
  expect(row.template).toBe("boutique");
  expect(row.scenes.length).toBeGreaterThanOrEqual(5);
  const theme = row.theme as TenantTheme;
  expect(theme.colors.primary).toBe("#7a1f5c");
  expect(theme.fonts).toEqual({ display: "Playfair Display", body: "Lato" });
  expect(theme.brand?.logo).toMatch(/\/uploads\/.+\/logo\.webp$/);
  expect(theme.brand?.logoSvg).toMatch(/logo\.svg$/);
  const logo = theme.brand!.logo!;

  // Sanitised SVG: no script, no event handler; served with a strict CSP.
  const svg = await page.request.get(`http://${slug}.localhost:${PORT}${theme.brand!.logoSvg}`);
  expect(svg.status()).toBe(200);
  const svgText = await svg.text();
  expect(svgText).not.toMatch(/<script|onload=/i);
  expect(svg.headers()["content-security-policy"]).toContain("default-src 'none'");

  // 3. Certificate request written for the new host (when the runner shares the server's directory).
  const certDir = process.env.CERT_REQUESTS_DIR;
  if (certDir) expect(fs.existsSync(path.join(certDir, `${slug}.${process.env.PLATFORM_ROOT_DOMAIN ?? "rundinova.com"}`))).toBe(true);

  // 4. Storefront on its sub-domain, right away.
  const shop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await shop.addInitScript(() => {
    const w = window as unknown as { __loaderLogo?: string };
    new MutationObserver(() => {
      const img = document.querySelector("[data-experience-loader] img");
      if (img) w.__loaderLogo = img.getAttribute("src") ?? "";
    }).observe(document, { subtree: true, childList: true });
  });
  const response = await shop.goto(`http://${slug}.localhost:${PORT}/?mode=3d`);
  expect(response?.status()).toBe(200);

  // Same template as Krumbz: header, 5 scenes, footer.
  await expect(shop.locator("main h1")).toBeVisible();
  await expect(shop.locator("[data-scene]")).toHaveCount(row.scenes.length);
  await expect(shop.locator("footer")).toBeVisible();

  // Logo: header, door transition, loader.
  await expect(shop.locator("header [data-shop-logo]").first()).toHaveAttribute("src", logo);
  await expect(shop.locator(`.curtain-mark img[src="${logo}"]`)).toHaveCount(1);
  await expect.poll(() => shop.evaluate(() => (window as unknown as { __loaderLogo?: string }).__loaderLogo ?? ""), { timeout: 60_000 }).toBe(logo);

  // Favicon / apple-touch-icon / manifest generated from the logo.
  const icon = await shop.locator('link[rel="icon"]').first().getAttribute("href");
  expect(icon).toMatch(/\/uploads\/.+\/icon-32\.png$/);
  expect((await shop.request.get(`http://${slug}.localhost:${PORT}${icon}`)).headers()["content-type"]).toBe("image/png");
  await expect(shop.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /icon-180\.png$/);
  const manifestHref = await shop.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await (await shop.request.get(`http://${slug}.localhost:${PORT}${manifestHref}`)).json();
  expect(manifest.name).toBe("Boutique Neuf");
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toContain("512x512");

  // Colours and fonts on the storefront.
  const vars = await shop.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--color-navy").trim());
  expect(vars.toLowerCase()).toBe("#7a1f5c");
  const h1Font = await shop.locator("main h1").evaluate((el) => getComputedStyle(el).fontFamily);
  expect(h1Font).toMatch(/Playfair/i);

  // Share image: the card generated from the logo + palette.
  await expect(shop.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /\/uploads\/.+\/og\.png$/);

  // 5. A theme change in the admin is visible on the storefront immediately.
  await page.goto(`/vendeurs/${row.id}`);
  await page.getByText("Apparence (couleurs, polices, logo)").click();
  await expect(page.getByTestId("admin-logo-preview")).toHaveAttribute("src", logo);
  await page.locator('input[name="color.primary"]').fill("#1f6f5c");
  await page.locator('input[name="palette.navy"]').fill("#1f6f5c");
  await page.getByRole("button", { name: "Enregistrer le thème" }).click();
  await expect(page.getByText("Thème enregistré.")).toBeVisible({ timeout: 30_000 });
  let visits = 0;
  await expect
    .poll(
      async () => {
        visits++;
        await shop.goto(`http://${slug}.localhost:${PORT}/`);
        return shop.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--color-navy").trim().toLowerCase());
      },
      { timeout: 20_000 },
    )
    .toBe("#1f6f5c");
  expect(visits, "la nouvelle couleur est servie dès la première visite").toBe(1);
  await shop.close();
});
