/**
 * Shared contract of the multi-vendor platform (docs/plan.md §2, §4).
 * Every agent / module codes against these types. Change them only through
 * the lead, never unilaterally in a feature branch.
 */

export const PLATFORM_LOCALES = ["fr", "rn", "en", "sw"] as const;
export type PlatformLocale = (typeof PLATFORM_LOCALES)[number];
/** Text translated per locale; `fr` is always present and is the fallback. */
export type Localized = { fr: string } & Partial<Record<Exclude<PlatformLocale, "fr">, string>>;

/** Sub-domains that can never be a vendor slug (taken by other projects on the VPS or by the platform). */
export const RESERVED_SLUGS = [
  "www", "admin", "espace", "api", "app", "staging", "mail", "static", "assets",
  "cdn", "storage", "s3", "chat", "livekit", "livekit-admin", "workspace", "koraneza",
  "tableyawe", "tableyawe-api", "shopsync", "games", "realtime", "central", "rundinova",
] as const;
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

/** Bespoke experiences (custom code) vs the generic immersive template. */
export type TemplateId = "krumbz" | "vitrine";

export type TenantStatus = "active" | "trial" | "paused";

export type FeatureKey = "threeD" | "advancedAnimations" | "languages" | "stats";
export type TenantFeatures = Record<FeatureKey, boolean>;

export interface TenantTheme {
  colors: { background: string; surface: string; primary: string; accent: string; text: string; muted: string };
  fonts: { display: string; body: string }; // Google Fonts family names
  radius: "soft" | "round" | "sharp";
  logoUrl: string | null;
}

export interface TenantContact {
  whatsapp: string; // digits with country code, e.g. 25768497372
  phones: string[]; // E.164
  email: string | null;
  address: string | null;
  city: string | null;
  hours: string | null;
  mapUrl: string | null;
  socials: { network: string; url: string }[];
}

/** A life-moment scene of the generic template (photo + copy). */
export interface TenantScene {
  id: string;
  imageUrl: string;
  label: Localized;
  title: Localized;
  text: Localized;
  alt: Localized;
}

export interface Product {
  id: string;
  tenantId: string;
  slug: string;
  name: Localized;
  short: Localized;
  description: Localized;
  price: number | null; // BIF
  compareAtPrice: number | null; // promo: previous price
  promoLabel: Localized | null;
  visible: boolean;
  featured: boolean;
  sortOrder: number;
  images: { url: string; alt: Localized; width: number; height: number }[];
  /** Optimised glTF (featured products, set by the super-admin only). */
  modelUrl: string | null;
  facts: { label: Localized; value: Localized }[]; // weight, units, …
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  template: TemplateId;
  locales: PlatformLocale[]; // first = default
  theme: TenantTheme;
  contact: TenantContact;
  features: TenantFeatures;
  /** Free-form localized texts of the template (hero, sections, legal…). Krumbz: content/site.*.json. */
  content: Record<string, unknown>;
  scenes: TenantScene[];
}

/** Everything a storefront page needs, resolved for one request. */
export interface StorefrontData {
  tenant: Tenant;
  products: Product[]; // visible only
  locale: PlatformLocale;
}
