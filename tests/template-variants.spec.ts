import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";
import { closeDb, getDb } from "../src/lib/db/client.ts";
import { FEATURE_KEYS } from "../src/lib/db/mappers.ts";
import { products, subscriptions, tenantFeatures, tenants } from "../src/lib/db/schema.ts";
import { starterScenes } from "../src/lib/admin/scenes.ts";
import type { TenantContact, TenantScene, TenantTheme } from "../src/lib/tenant/types.ts";

/**
 * The single template with the MINIMUM shop (5 scenes, no optional section: neither highlight, benefits,
 * craft section, story nor legal texts) and with EVERYTHING (all Krumbz-schema sections, 8 scenes):
 * no console error, no empty heading, no link to a missing page, desktop and mobile.
 * Runs against PW_BASE_URL (storefront hosts <slug>.localhost).
 */
const PORT = new URL(process.env.PW_BASE_URL ?? "http://localhost:3000").port || "3000";
const shopUrl = (slug: string, p = "/") => `http://${slug}.localhost:${PORT}${p}`;

const theme: TenantTheme = {
  colors: { background: "#f6f7fb", surface: "#ffffff", primary: "#24305e", accent: "#f76c6c", text: "#1b1d2a", muted: "#5b5f6a" },
  fonts: { display: "Poppins", body: "Inter" },
  radius: "soft",
  logoUrl: null,
};
const contact: TenantContact = { whatsapp: "25768000000", phones: ["+25768000000"], email: null, address: null, city: "Gitega", hours: null, mapUrl: null, socials: [] };

const krumbzFr = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "site.fr.json"), "utf8")) as Record<string, unknown>;
// « Everything »: every section of the schema filled (Krumbz texts reused as a full sample, brand renamed).
const fullContent = { fr: JSON.parse(JSON.stringify(krumbzFr).replaceAll("Krumbz", "Toutes Sections")) };

const scenes = (slug: string, count: number): TenantScene[] =>
  Array.from({ length: count }, (_, i) => ({ ...starterScenes(slug)[i % 5], id: `scene-${i + 1}` }));

test.describe.configure({ mode: "serial" });

/** One set of shops per Playwright project (desktop / mobile run in parallel workers). */
const slugOf = (base: string) => `${base}-${test.info().project.name}`;

const SHOPS = [
  { slug: "tv-minimum", name: "Minimum Shop", content: {}, scenes: 5 },
  { slug: "tv-complet", name: "Toutes Sections", content: fullContent, scenes: 8 },
];

test.beforeAll(async () => {
  const db = getDb();
  await db.delete(tenants).where(inArray(tenants.slug, SHOPS.map((s) => slugOf(s.slug))));
  for (const shop of SHOPS) {
    const [row] = await db
      .insert(tenants)
      .values({ slug: slugOf(shop.slug), name: shop.name, status: "active", template: "boutique", locales: ["fr", "en"], theme, contact, content: shop.content, scenes: scenes(slugOf(shop.slug), shop.scenes) })
      .returning({ id: tenants.id });
    await db.insert(tenantFeatures).values(FEATURE_KEYS.map((key) => ({ tenantId: row.id, key, enabled: key !== "stats" })));
    await db.insert(subscriptions).values({ tenantId: row.id, plan: "actif", status: "active", endsAt: null, priceBif: 0 });
    await db.insert(products).values([
      { tenantId: row.id, slug: "article-a", name: { fr: "Article A" }, short: { fr: "Le premier" }, description: { fr: "Description A" }, price: 12000, featured: true, sortOrder: 0, facts: [{ label: { fr: "Taille" }, value: { fr: "M" } }] },
      { tenantId: row.id, slug: "article-b", name: { fr: "Article B" }, short: { fr: "Le second" }, description: { fr: "Description B" }, price: 8000, featured: false, sortOrder: 1, facts: [] },
    ]);
  }
  await closeDb();
});

test.afterAll(async () => {
  if (process.env.PW_KEEP_VARIANTS) return; // keep the shops for manual screenshots
  const db = getDb();
  await db.delete(tenants).where(inArray(tenants.slug, SHOPS.map((s) => slugOf(s.slug))));
  await closeDb();
});

function watch(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

async function noEmptyHeadings(page: Page) {
  const empty = await page.$$eval("main h1, main h2, main h3, main h4", (els) => els.filter((e) => !e.textContent?.trim()).map((e) => e.outerHTML.slice(0, 80)));
  expect(empty, "headings without text").toEqual([]);
}

for (const shop of SHOPS) {
  test.describe(shop.slug, () => {
    test("home, products, order: complete, no console error", async ({ page }) => {
      const errors = watch(page);
      const slug = slugOf(shop.slug);
      await page.goto(shopUrl(slug));
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator("[data-scene]")).toHaveCount(shop.scenes);
      await noEmptyHeadings(page);
      // Scroll the whole journey (animations, 3D/static fallbacks).
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 900) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.waitForTimeout(150);
      }
      const minimal = shop.content && Object.keys(shop.content).length === 0;
      // Optional pages: linked only when they exist, and 404 otherwise.
      const storyLinks = page.locator('a[href$="/notre-histoire"]');
      const legalLinks = page.locator('a[href$="/mentions-legales"]');
      if (minimal) {
        await expect(storyLinks).toHaveCount(0);
        await expect(legalLinks).toHaveCount(0);
        await expect(page.locator("#from-mushroom-title, #benefits-title, #mushroom-title")).toHaveCount(0);
      } else {
        expect(await storyLinks.count()).toBeGreaterThan(0);
        expect(await legalLinks.count()).toBeGreaterThan(0);
      }
      for (const p of ["/produits", "/commander", "/contact"]) {
        const res = await page.goto(shopUrl(slug, p));
        expect(res?.status(), p).toBe(200);
        await noEmptyHeadings(page);
      }
      const story = await page.goto(shopUrl(slug, "/notre-histoire"));
      expect(story?.status()).toBe(minimal ? 404 : 200);
      expect(errors.filter((e) => !/404|Failed to load resource/.test(e)), errors.join("\n")).toEqual([]);
    });
  });
}

test("the shop data stays in its storefront", async ({ page }) => {
  await page.goto(shopUrl(slugOf("tv-minimum")));
  await expect(page.getByText("Toutes Sections")).toHaveCount(0);
  const db = getDb();
  const rows = await db.select({ slug: tenants.slug }).from(tenants).where(eq(tenants.slug, slugOf("tv-minimum")));
  expect(rows).toHaveLength(1);
  await closeDb();
});
