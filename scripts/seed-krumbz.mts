#!/usr/bin/env node
/**
 * Krumbz = vendor #1 (template "krumbz"). Imports from content/site.{fr,en,rn,sw}.json
 * into the database: the tenant, its contacts / WhatsApp / socials, and its products
 * (names, texts, prices, promos, weight, contents). Idempotent: re-running updates
 * the same rows (tenant by slug, products by slug); products added later by the
 * vendor are kept. All other Krumbz texts stay in the content files.
 *
 *   npm run db:migrate && npm run db:seed:krumbz
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/lib/db/client.ts";
import { products, subscriptions, tenantFeatures, tenants } from "../src/lib/db/schema.ts";
import { FEATURE_KEYS } from "../src/lib/db/mappers.ts";
import type { Localized, PlatformLocale, TenantContact, TenantTheme } from "../src/lib/tenant/types.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES: PlatformLocale[] = ["fr", "en", "rn", "sw"]; // src/i18n/config.ts ACTIVE_LOCALES, fr = default

type Item = { id: string; name: string; short: string; description: string; weight: string; unitsPerPack: string; price: number | null; compareAtPrice: number | null };
type Site = {
  brand: { name: string };
  contact: {
    phones: { e164: string }[];
    whatsapp: { number: string };
    email: string;
    address: string;
    city: string;
    hours: string;
    mapUrl: string;
    socials: { network: string; url: string }[];
  };
  products: { items: Item[]; promoLabel: string; formats: { weight: string; units: string } };
};

const site = Object.fromEntries(
  LOCALES.map((locale) => [locale, JSON.parse(fs.readFileSync(path.join(root, "content", `site.${locale}.json`), "utf8")) as Site]),
) as Record<PlatformLocale, Site>;
const fr = site.fr;

/** Same text in every locale where the file defines it (content files fall back to French when a key is missing). */
function localized(pick: (s: Site) => string | undefined): Localized {
  const value: Record<string, string> = { fr: pick(fr) ?? "" };
  for (const locale of LOCALES.slice(1)) {
    const text = pick(site[locale]);
    if (text) value[locale] = text;
  }
  return value as Localized;
}

const itemOf = (s: Site, id: string) => s.products?.items?.find((item) => item.id === id);
const nullIfBlank = (value: string | undefined) => (value && value.trim() ? value : null);

const theme: TenantTheme = {
  colors: { background: "#fff6e8", surface: "#f8d58a", primary: "#12264a", accent: "#e2a23a", text: "#12264a", muted: "#a4501a" },
  fonts: { display: "Fredoka", body: "Nunito" },
  radius: "round",
  logoUrl: null,
};

const contact: TenantContact = {
  whatsapp: fr.contact.whatsapp.number,
  phones: fr.contact.phones.map((p) => p.e164),
  email: nullIfBlank(fr.contact.email),
  address: nullIfBlank(fr.contact.address),
  city: nullIfBlank(fr.contact.city),
  hours: nullIfBlank(fr.contact.hours),
  mapUrl: nullIfBlank(fr.contact.mapUrl),
  socials: fr.contact.socials.filter((s) => s.url).map(({ network, url }) => ({ network, url })),
};

const db = getDb();
try {
  await db.transaction(async (tx) => {
    const tenantValues = {
      slug: "krumbz",
      name: fr.brand.name,
      status: "active" as const,
      template: "krumbz" as const,
      locales: LOCALES,
      theme,
      contact,
      content: {},
      scenes: [],
    };
    const [tenant] = await tx
      .insert(tenants)
      .values(tenantValues)
      .onConflictDoUpdate({ target: tenants.slug, set: { ...tenantValues, updatedAt: sql`now()` } })
      .returning({ id: tenants.id });

    for (const key of FEATURE_KEYS) {
      await tx
        .insert(tenantFeatures)
        .values({ tenantId: tenant.id, key, enabled: true })
        .onConflictDoUpdate({ target: [tenantFeatures.tenantId, tenantFeatures.key], set: { enabled: true } });
    }

    for (const [index, item] of fr.products.items.entries()) {
      const onSale = item.price !== null && item.compareAtPrice !== null && item.compareAtPrice > item.price;
      const values = {
        tenantId: tenant.id,
        slug: item.id,
        name: localized((s) => itemOf(s, item.id)?.name),
        short: localized((s) => itemOf(s, item.id)?.short),
        description: localized((s) => itemOf(s, item.id)?.description),
        price: item.price,
        compareAtPrice: item.compareAtPrice,
        promoLabel: onSale ? localized((s) => s.products?.promoLabel) : null,
        visible: true,
        featured: true,
        sortOrder: index,
        modelUrl: null,
        // Krumbz template reads facts in this order: net weight, contents.
        facts: [
          { label: localized((s) => s.products?.formats?.weight), value: localized((s) => itemOf(s, item.id)?.weight) },
          { label: localized((s) => s.products?.formats?.units), value: localized((s) => itemOf(s, item.id)?.unitsPerPack) },
        ],
      };
      await tx
        .insert(products)
        .values(values)
        .onConflictDoUpdate({ target: [products.tenantId, products.slug], set: { ...values, updatedAt: sql`now()` } });
    }

    const [subscription] = await tx.select({ id: subscriptions.id }).from(subscriptions).where(eq(subscriptions.tenantId, tenant.id)).limit(1);
    if (!subscription) {
      await tx.insert(subscriptions).values({ tenantId: tenant.id, plan: "fondateur", status: "active", endsAt: null, priceBif: 0 });
    }

    const count = await tx.$count(products, and(eq(products.tenantId, tenant.id), eq(products.visible, true)));
    console.log(`[seed] krumbz (${tenant.id}) : ${count} produit(s) visible(s), contacts et WhatsApp importés.`);
  });
} finally {
  await closeDb();
}
