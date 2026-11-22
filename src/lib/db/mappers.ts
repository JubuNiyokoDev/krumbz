/** DB rows ↔ shared contract types (src/lib/tenant/types.ts). Pure functions. */
import type { ProductImageRow, ProductRow, TenantRow } from "./schema.ts";
import type { FeatureKey, Product, Tenant, TenantFeatures } from "../tenant/types.ts";

export const FEATURE_KEYS: FeatureKey[] = ["threeD", "advancedAnimations", "languages", "stats"];

export function toFeatures(rows: { key: FeatureKey; enabled: boolean }[]): TenantFeatures {
  const features = Object.fromEntries(FEATURE_KEYS.map((key) => [key, false])) as TenantFeatures;
  for (const row of rows) if (FEATURE_KEYS.includes(row.key)) features[row.key] = row.enabled;
  return features;
}

export function toTenant(row: TenantRow, features: TenantFeatures): Tenant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    template: row.template,
    locales: row.locales,
    theme: row.theme,
    contact: row.contact,
    features,
    content: row.content,
    scenes: row.scenes,
  };
}

export function toProduct(row: ProductRow, images: ProductImageRow[] = []): Product {
  return {
    id: row.id,
    tenantId: row.tenantId,
    slug: row.slug,
    name: row.name,
    short: row.short,
    description: row.description,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    promoLabel: row.promoLabel ?? null,
    visible: row.visible,
    featured: row.featured,
    sortOrder: row.sortOrder,
    images: images
      .filter((image) => image.productId === row.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((image) => ({ url: image.url, alt: image.alt, width: image.width, height: image.height })),
    modelUrl: row.modelUrl,
    facts: row.facts,
  };
}

/** Writable product fields (contract → row). `tenantId` is never taken from the input. */
export type ProductInput = Partial<
  Pick<
    Product,
    "slug" | "name" | "short" | "description" | "price" | "compareAtPrice" | "promoLabel" | "visible" | "featured" | "sortOrder" | "modelUrl" | "facts"
  >
>;

export function productInputToRow(input: ProductInput) {
  const row: Partial<Omit<ProductRow, "id" | "tenantId" | "createdAt" | "updatedAt">> = {};
  const keys = [
    "slug", "name", "short", "description", "price", "compareAtPrice", "promoLabel", "visible", "featured", "sortOrder", "modelUrl", "facts",
  ] as const;
  for (const key of keys) {
    if (input[key] !== undefined) (row as Record<string, unknown>)[key] = input[key];
  }
  return row;
}
