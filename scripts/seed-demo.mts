#!/usr/bin/env node
/**
 * Seeds the demonstration shop « Ikirenge Shoes » (template vitrine) from the typed demo data used
 * by the template preview. Idempotent: upserts by slug, replaces the product images on each run.
 *
 *   npm run db:migrate && npm run db:seed:demo
 *
 * Contact details and the WhatsApp number are PROVISIONAL (owner decision D4), as in the template.
 */
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/lib/db/client.ts";
import { productImages, products, subscriptions, tenantFeatures, tenants } from "../src/lib/db/schema.ts";
import { FEATURE_KEYS } from "../src/lib/db/mappers.ts";
import { demoTenant, demoProducts } from "../src/templates/vitrine/demo/shoes.ts";

const db = getDb();
try {
  const tenantValues = {
    slug: demoTenant.slug,
    name: demoTenant.name,
    status: demoTenant.status,
    template: demoTenant.template,
    locales: demoTenant.locales,
    theme: demoTenant.theme,
    contact: demoTenant.contact,
    content: {
      ...demoTenant.content,
      gallery: { imageUrl: "/demo/images/scene-lac.svg", tagline: demoTenant.content.tagline },
    },
    scenes: demoTenant.scenes,
  };
  const [tenant] = await db
    .insert(tenants)
    .values(tenantValues)
    .onConflictDoUpdate({ target: tenants.slug, set: { ...tenantValues, updatedAt: sql`now()` } })
    .returning({ id: tenants.id });

  for (const key of FEATURE_KEYS) {
    await db
      .insert(tenantFeatures)
      .values({ tenantId: tenant.id, key, enabled: demoTenant.features[key] })
      .onConflictDoUpdate({ target: [tenantFeatures.tenantId, tenantFeatures.key], set: { enabled: demoTenant.features[key] } });
  }
  await db
    .insert(subscriptions)
    .values({ tenantId: tenant.id, plan: "demo", status: "active", priceBif: 0 })
    .onConflictDoNothing();

  for (const product of demoProducts) {
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
  console.log(`[seed] ${demoTenant.slug} (${tenant.id}) : ${demoProducts.length} produit(s).`);
} finally {
  await closeDb();
}
