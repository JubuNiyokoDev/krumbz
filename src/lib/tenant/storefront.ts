/**
 * Public (storefront) data API for Next.js server code — cached per tenant.
 *
 *   getTenantBySlug(slug)            → Tenant | null
 *   getStorefrontData(slug, locale)  → StorefrontData | null (visible products only)
 *   revalidateTenant(slug)           → call after ANY change of a tenant or its products
 *
 * Results live in the Next.js data cache (unstable_cache: survives restarts and
 * deployments) under the tag `tenant:<slug>`; pages built from them are static
 * (ISR) and are re-rendered on the next visit after revalidateTenant().
 * No database hit per request once a page is cached.
 */
import "server-only";
import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { getDb, hasDatabase } from "../db/client.ts";
import { findStorefront, findTenantBySlug, listStorefronts } from "./queries.ts";
import { invalidateTenantRoute } from "./route-cache.ts";
import type { StorefrontData, TemplateId, Tenant } from "./types.ts";

export const TENANTS_TAG = "tenants";
export const tenantTag = (slug: string) => `tenant:${slug}`;
/** Cross-tenant listings (Rundinova Studio gallery): refreshed whenever any tenant changes. */
export const GALLERY_TAG = "platform-gallery";

export const getTenantBySlug = cache(
  (slug: string): Promise<Tenant | null> =>
    unstable_cache(() => findTenantBySlug(getDb(), slug), ["tenant-by-slug", slug], { tags: [TENANTS_TAG, tenantTag(slug)] })(),
);

export const getStorefrontData = cache(
  (slug: string, locale: string): Promise<StorefrontData | null> =>
    unstable_cache(() => findStorefront(getDb(), slug, locale), ["storefront", slug, locale], { tags: [TENANTS_TAG, tenantTag(slug)] })(),
);

/**
 * Storefronts of a template known at build time (generateStaticParams). Returns
 * [] without a database (e.g. Docker build): pages are then rendered on first
 * visit and cached.
 */
export async function listStorefrontParams(template?: TemplateId): Promise<{ tenant: string; locale: string }[]> {
  if (!hasDatabase()) return [];
  try {
    const shops = await listStorefronts(getDb(), template);
    return shops.flatMap((shop) => shop.locales.map((locale) => ({ tenant: shop.slug, locale })));
  } catch (error) {
    console.warn(`[storefront] no static params${template ? ` for ${template}` : ""}: ${(error as Error).message}`);
    return [];
  }
}

/**
 * Invalidates everything cached for a tenant (data, pages, proxy route).
 * Call it from Server Actions / Route Handlers after a write (product, price,
 * promo, contact, status…). The next visit re-renders with fresh data.
 */
export function revalidateTenant(slug: string): void {
  revalidateTag(tenantTag(slug), { expire: 0 });
  revalidateTag(GALLERY_TAG, { expire: 0 });
  invalidateTenantRoute(slug);
}

/** After creating / deleting / renaming tenants (lists, galleries). */
export function revalidateTenants(): void {
  revalidateTag(TENANTS_TAG, { expire: 0 });
  invalidateTenantRoute();
}
