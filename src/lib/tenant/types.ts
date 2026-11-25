/**
 * Shared contract of the multi-vendor platform (docs/plan.md §2, §4).
 * Every agent / module codes against these types. Change them only through
 * the lead, never unilaterally in a feature branch.
 */

export const PLATFORM_LOCALES = ["fr", "rn", "en", "sw"] as const;
export type PlatformLocale = (typeof PLATFORM_LOCALES)[number];
/** Text translated per locale; `fr` is always present and is the fallback. */
export type Localized = { fr: string } & Partial<Record<Exclude<PlatformLocale, "fr">, string>>;

/**
 * Sub-domains that can never be a vendor slug (taken by other projects on the VPS or by the platform).
 * Hosts: isoko.rundinova.com = Rundinova Studio marketing site; rundinova.com = official company site (NOT the platform).
 */
export const RESERVED_SLUGS = [
  "www", "admin", "espace", "api", "app", "staging", "mail", "static", "assets",
  "cdn", "storage", "s3", "chat", "livekit", "livekit-admin", "workspace", "koraneza",
  "tableyawe", "tableyawe-api", "shopsync", "games", "realtime", "central", "rundinova",
  "isoko", "tech",
] as const;
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

/**
 * ONE storefront template for every shop (the Krumbz experience, docs/progress.md — décision du 2026-11-22).
 * "krumbz" = that template + the Krumbz-only assets (procedural sachet/carton/biscuit, built-in scenes,
 * content/site.*.json); "boutique" = the same template fed only by the tenant's data.
 */
export type TemplateId = "krumbz" | "boutique";

export type TenantStatus = "active" | "trial" | "paused";

export type FeatureKey = "threeD" | "advancedAnimations" | "languages" | "stats";
export type TenantFeatures = Record<FeatureKey, boolean>;

/**
 * Colour tokens of the storefront (Tailwind @theme names in src/app/globals.css: cream → --color-cream,
 * creamDeep → --color-cream-deep …). Missing tokens are derived from TenantTheme.colors
 * (src/lib/storefront/theme.ts). Krumbz stores its exact palette.
 */
export const PALETTE_KEYS = [
  "cream", "creamDeep", "gold", "goldLight", "goldDark", "rust", "rustBright", "navy", "navySoft", "ink", "whatsapp",
] as const;
export type PaletteKey = (typeof PALETTE_KEYS)[number];
export type TenantPalette = Record<PaletteKey, string>;

export interface TenantTheme {
  colors: { background: string; surface: string; primary: string; accent: string; text: string; muted: string };
  /** Explicit storefront tokens (#rrggbb); any missing key is derived from `colors`. */
  palette?: Partial<TenantPalette>;
  fonts: { display: string; body: string }; // Google Fonts family names (curated list, src/app/fonts.ts)
  radius: "soft" | "round" | "sharp";
  logoUrl: string | null;
  /** Square icon (favicon / apple-touch); defaults to the logo. */
  iconUrl?: string | null;
  /** Files generated from the logo / icon upload (src/lib/uploads/brand.ts). */
  brand?: TenantBrandAssets | null;
}

/** Generated brand set of a shop: displayed logo (alpha kept), original SVG, favicons, share card. */
export interface TenantBrandAssets {
  logo: string | null;
  logoPng: string | null;
  logoSvg: string | null;
  icon32: string;
  icon180: string;
  icon192: string;
  icon512: string;
  og: string | null;
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

/** Box measured on the landscape photo, in % of the image: [x0, y0, x1, y1]. */
export type SceneBox = [x0: number, y0: number, x1: number, y1: number];

/** Framing of a life-moment photo (same model as Krumbz, src/lib/assets/scene-framing.ts). */
export interface SceneFramingData {
  /** Wide screens: "full" = full-bleed photo with a free side; "card" = whole photo in a card (crowded photos). */
  desktop?: "full" | "card";
  /** Calm side of the photo, where the copy and the 3D product go. */
  freeSide: "left" | "right";
  /** Faces that must stay visible (phones crop the landscape photo around them). */
  faces: SceneBox[];
  /** The product in the photo (or the main subject) — kept visible too. */
  sachet: SceneBox;
  /** CSS object-position on wide screens. */
  wide: string;
  /** Copy column width (vw). */
  copy: { width: number };
  /** 3D product box: centre in vw/svh, size in svh. */
  anchor: { cx: number; cy: number; size: number };
}

/** Minimum / maximum number of life-moment scenes of a shop (super-admin validation). */
export const MIN_SCENES = 5;
export const MAX_SCENES = 24;

/** A life-moment scene of the storefront home page (photo + copy + framing). */
export interface TenantScene {
  id: string; // slug, unique within the shop
  image: {
    /** 16:9 photo (public path or /uploads/…), people on ONE side. */
    landscape: string;
    /** 9:16 photo for phones (optional: the landscape one is cropped around the faces). */
    portrait: string | null;
    /** Shown while the photos above do not exist yet (provisional visual). */
    fallback: string | null;
  };
  /** Width / height of the landscape photo (default 16:9). */
  aspect?: number;
  label: Localized;
  title: Localized;
  text: Localized;
  alt: Localized;
  framing: SceneFramingData;
  /** Composition of the 3D journey (src/components/three/poses.ts POSE_NAMES); null = chosen by position. */
  pose: string | null;
}

/**
 * Non-localized images of the template sections, stored in tenant.content.media.
 * Public paths or /uploads/… URLs; a section whose image is missing shows its text-only variant.
 */
export interface TenantMedia {
  /** Intro / fallback product photo (default: first featured product image). */
  studio?: string | null;
  /** Small cut-out shown on the scenes in static mode (default: studio). */
  cutout?: string | null;
  /** Share image 1200 × 630. */
  og?: string | null;
  /** home.fromMushroom (highlight right after the intro). */
  highlight?: string | null;
  /** home.moments.breaks[i]. */
  breaks?: string[];
  /** home.mushroom images. */
  harvest?: string | null;
  closeup?: string | null;
  /** story.chapters[i]. */
  story?: string[];
  /** story.journey.steps[i]. */
  journey?: string[];
  /** Products page, next to the composition. */
  ingredients?: string | null;
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
  /**
   * Texts of the template, one object per locale with EXACTLY the Krumbz schema (content/site.fr.json):
   * { fr: {...}, en: {...}, rn: {...}, sw: {...}, media: TenantMedia, gallery: {...} }.
   * Missing locales/keys fall back to French; absent optional sections are hidden.
   * Krumbz: content/site.*.json, with tenant.content[locale] overriding top-level keys.
   */
  content: Record<string, unknown>;
  scenes: TenantScene[];
}

/** Everything a storefront page needs, resolved for one request. */
export interface StorefrontData {
  tenant: Tenant;
  products: Product[]; // visible only
  locale: PlatformLocale;
}
