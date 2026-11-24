/** DB rows ↔ shared contract types (src/lib/tenant/types.ts). Pure functions. */
import type { ProductImageRow, ProductRow, TenantRow } from "./schema.ts";
import type { FeatureKey, Product, SceneFramingData, Tenant, TenantFeatures, TenantScene } from "../tenant/types.ts";

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
    scenes: (row.scenes ?? []).map(normalizeScene),
  };
}

/** Neutral framing of a scene without measured boxes: people on the left, free side on the right. */
export const DEFAULT_SCENE_FRAMING: SceneFramingData = {
  freeSide: "right",
  faces: [[10, 10, 50, 55]],
  sachet: [20, 55, 45, 90],
  wide: "0% 45%",
  copy: { width: 30 },
  anchor: { cx: 84, cy: 70, size: 28 },
};

/** Accepts the legacy scene rows ({ imageUrl, … }, before the single template) and fills the missing fields. */
export function normalizeScene(raw: TenantScene): TenantScene {
  const legacy = raw as TenantScene & { imageUrl?: string };
  const image = raw.image ?? { landscape: legacy.imageUrl ?? "", portrait: null, fallback: null };
  return {
    id: raw.id,
    image: { landscape: image.landscape ?? "", portrait: image.portrait ?? null, fallback: image.fallback ?? null },
    ...(raw.aspect ? { aspect: raw.aspect } : {}),
    label: raw.label ?? { fr: "" },
    title: raw.title ?? { fr: "" },
    text: raw.text ?? { fr: "" },
    alt: raw.alt ?? { fr: "" },
    framing: raw.framing ?? DEFAULT_SCENE_FRAMING,
    pose: raw.pose ?? null,
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
