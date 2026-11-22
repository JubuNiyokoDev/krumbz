/**
 * Uncached, framework-free tenant reads (public side). Next.js code uses the
 * cached wrappers of ./storefront.ts; scripts and tests call these directly.
 * Vendor-side reads/writes go through forTenant() (./scoped.ts), never here.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { productImages, products, tenantFeatures, tenants } from "../db/schema.ts";
import { toFeatures, toProduct, toTenant } from "../db/mappers.ts";
import { PLATFORM_LOCALES, SLUG_PATTERN, type PlatformLocale, type StorefrontData, type TemplateId, type Tenant, type TenantStatus } from "./types.ts";

export function isPlatformLocale(value: unknown): value is PlatformLocale {
  return typeof value === "string" && (PLATFORM_LOCALES as readonly string[]).includes(value);
}

export async function findTenantBySlug(db: Db, slug: string): Promise<Tenant | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  const [row] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  if (!row) return null;
  const features = await db
    .select({ key: tenantFeatures.key, enabled: tenantFeatures.enabled })
    .from(tenantFeatures)
    .where(eq(tenantFeatures.tenantId, row.id));
  return toTenant(row, toFeatures(features));
}

/** What the proxy needs to route a host: one indexed lookup, no JSON columns. */
export type TenantRoute = { id: string; slug: string; template: TemplateId; status: TenantStatus; locales: PlatformLocale[] };

export async function findTenantRoute(db: Db, slug: string): Promise<TenantRoute | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  const [row] = await db
    .select({ id: tenants.id, slug: tenants.slug, template: tenants.template, status: tenants.status, locales: tenants.locales })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);
  return row ?? null;
}

/** Tenant + its visible products (sorted), or null when the slug is unknown or the locale is not offered. */
export async function findStorefront(db: Db, slug: string, locale: string): Promise<StorefrontData | null> {
  const tenant = await findTenantBySlug(db, slug);
  if (!tenant || !isPlatformLocale(locale) || !tenant.locales.includes(locale)) return null;
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.tenantId, tenant.id), eq(products.visible, true)))
    .orderBy(asc(products.sortOrder), asc(products.createdAt));
  const images = rows.length
    ? await db
        .select()
        .from(productImages)
        .where(and(eq(productImages.tenantId, tenant.id), inArray(productImages.productId, rows.map((r) => r.id))))
    : [];
  return { tenant, products: rows.map((row) => toProduct(row, images)), locale };
}

/** Slugs (and locales) of the storefronts of a template, for generateStaticParams. Paused shops excluded. */
export async function listStorefronts(db: Db, template: TemplateId): Promise<{ slug: string; locales: PlatformLocale[] }[]> {
  const rows = await db
    .select({ slug: tenants.slug, locales: tenants.locales, status: tenants.status })
    .from(tenants)
    .where(eq(tenants.template, template));
  return rows.filter((row) => row.status !== "paused").map(({ slug, locales }) => ({ slug, locales }));
}
