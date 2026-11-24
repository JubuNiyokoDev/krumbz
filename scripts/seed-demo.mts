#!/usr/bin/env node
/**
 * Seeds the demonstration shop « Ikirenge Shoes » on the single storefront template (same experience
 * as Krumbz, its own palette, texts, scenes and products — scripts/demo/). Idempotent: upserts by slug,
 * replaces the product images on each run.
 *
 *   npm run db:migrate && npm run db:seed:demo
 *
 * Contact details and the WhatsApp number are PROVISIONAL (fictitious demo). Photos to provide:
 * docs/demo-ikirenge-photos.md (each file is used as soon as it exists).
 */
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/lib/db/client.ts";
import { productImages, products, subscriptions, tenantFeatures, tenants } from "../src/lib/db/schema.ts";
import { FEATURE_KEYS } from "../src/lib/db/mappers.ts";
import type { PlatformLocale, TenantFeatures } from "../src/lib/tenant/types.ts";
import { ikirengeContact, ikirengeContent, ikirengeScenes, ikirengeTheme } from "./demo/ikirenge.mts";
import { ikirengeProducts } from "./demo/ikirenge-products.mts";

const features: TenantFeatures = { threeD: true, advancedAnimations: true, languages: true, stats: false };
const locales: PlatformLocale[] = ["fr", "rn", "en", "sw"];

const db = getDb();
try {
  const tenantValues = {
    slug: "ikirenge",
    name: "Ikirenge Shoes",
    status: "active" as const,
    template: "boutique" as const,
    locales,
    theme: ikirengeTheme,
    contact: ikirengeContact,
    content: ikirengeContent as Record<string, unknown>,
    scenes: ikirengeScenes,
  };
  const [tenant] = await db
    .insert(tenants)
    .values(tenantValues)
    .onConflictDoUpdate({ target: tenants.slug, set: { ...tenantValues, updatedAt: sql`now()` } })
    .returning({ id: tenants.id });

  for (const key of FEATURE_KEYS) {
    await db
      .insert(tenantFeatures)
      .values({ tenantId: tenant.id, key, enabled: features[key] })
      .onConflictDoUpdate({ target: [tenantFeatures.tenantId, tenantFeatures.key], set: { enabled: features[key] } });
  }
  await db.insert(subscriptions).values({ tenantId: tenant.id, plan: "demo", status: "active", priceBif: 0 }).onConflictDoNothing();

  for (const product of ikirengeProducts) {
    const values = {
      tenantId: tenant.id,
      slug: product.slug,
      name: product.name,
      short: product.short,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      promoLabel: product.promoLabel,
      visible: product.visible,
      featured: product.featured,
      sortOrder: product.sortOrder,
      modelUrl: product.modelUrl,
      facts: product.facts,
    };
    const [row] = await db
      .insert(products)
      .values(values)
      .onConflictDoUpdate({ target: [products.tenantId, products.slug], set: { ...values, updatedAt: sql`now()` } })
      .returning({ id: products.id });
    await db.delete(productImages).where(eq(productImages.productId, row.id));
    if (product.images.length) {
      await db.insert(productImages).values(
        product.images.map((image, i) => ({
          id: randomUUID(),
          tenantId: tenant.id,
          productId: row.id,
          url: image.url,
          alt: image.alt,
          width: image.width,
          height: image.height,
          sortOrder: i,
        })),
      );
    }
  }
  console.log(`[seed] ikirenge (${tenant.id}) : ${ikirengeProducts.length} produit(s), ${ikirengeScenes.length} scène(s).`);
} finally {
  await closeDb();
}
