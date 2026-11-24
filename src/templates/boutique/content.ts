/**
 * Texts of the single storefront template (the Krumbz experience) for one request.
 *
 * - Krumbz (template "krumbz"): content/site.*.json, tenant.content[locale] overriding top-level keys
 *   (unchanged behaviour: Krumbz stays pixel-identical).
 * - Every other shop ("boutique"): the interface strings of the same files with the Krumbz texts removed
 *   (src/lib/storefront/neutral.ts), then tenant.content.fr, then tenant.content[locale] — EXACTLY the
 *   Krumbz schema; a section whose texts are absent is hidden by its component.
 *
 * Products, prices, promos, WhatsApp and contacts always come from the database. Every component keeps
 * reading the same SiteContent shape (server: loadStorefrontContent(locale), client: next-intl messages).
 */
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { tenant as tenantParam } from "next/root-params";
import { notFound } from "next/navigation";
import { loadContent, type SiteContent } from "@/lib/content";
import { neutralize } from "@/lib/storefront/neutral";
import { getStorefrontData } from "@/lib/tenant/storefront";
import type { Localized, PlatformLocale, Product, StorefrontData, Tenant } from "@/lib/tenant/types";

type Item = SiteContent["products"]["items"][number];
type Contact = SiteContent["contact"];
type Json = Record<string, unknown>;

/** Extra fields of a product item for the shops without bespoke 3D (ignored by Krumbz components). */
export interface BoutiqueItemExtras {
  slug?: string;
  featured?: boolean;
  /** First existing photo of the product (cut-out PNG preferred), or null. */
  image?: { url: string; alt: string; width: number; height: number } | null;
  images?: { url: string; alt: string; width: number; height: number }[];
  modelUrl?: string | null;
  /** Labels of the two facts shown by the product card (Krumbz: « Poids net », « Contenu »). */
  factLabels?: [string, string];
  promoLabel?: string;
}

/** 3D models / pack illustrations of the Krumbz template. */
const KRUMBZ_MODELS = ["sachet", "carton"] as const;

const SOCIAL_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X",
  linkedin: "LinkedIn",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
};

export const isBespoke = (tenant: Pick<Tenant, "template">) => tenant.template === "krumbz";

export function text(value: Localized | null | undefined, locale: string): string {
  if (!value) return "";
  return (value as Record<string, string | undefined>)[locale] || value.fr;
}

/** "+25768497372" → "+257 68 49 73 72" (Burundi: +257 then pairs); other numbers: country code then groups of 3. */
export function formatPhoneDisplay(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.startsWith("257") && digits.length === 11) return `+257 ${digits.slice(3).match(/\d{2}/g)!.join(" ")}`;
  const cc = digits.slice(0, 3);
  const rest = digits.slice(3).match(/\d{1,3}/g) ?? [];
  return `+${[cc, ...rest].join(" ")}`;
}

// ---- files -----------------------------------------------------------------

const PUBLIC_DIR = path.join(process.cwd(), "public");
const uploadsDir = () => path.resolve(process.env.UPLOADS_DIR ?? path.join(process.cwd(), ".data", "uploads"));

/** True when a public path (/images/…) or an uploaded file (/uploads/…) exists. External URLs: true. */
export function mediaExists(url: string | null | undefined): url is string {
  if (!url) return false;
  if (/^https?:\/\//.test(url)) return true;
  const clean = decodeURIComponent(url.split(/[?#]/)[0]);
  if (clean.includes("..")) return false;
  const file = clean.startsWith("/uploads/") ? path.join(uploadsDir(), clean.slice("/uploads/".length)) : path.join(PUBLIC_DIR, clean);
  try {
    const stat = fs.statSync(file);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

// ---- merge -----------------------------------------------------------------

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Deep merge for the shop texts: objects merge key by key; arrays of objects merge item by item when
 * `itemwise` (translations keep the French images/ids), otherwise the override array replaces the base;
 * scalars: a defined override of the same kind wins.
 */
function mergeTexts(base: unknown, override: unknown, itemwise: boolean): unknown {
  if (override === undefined || override === null) return base;
  if (Array.isArray(override)) {
    if (!Array.isArray(base)) return override;
    if (!itemwise) return override;
    const length = Math.max(base.length, override.length);
    return Array.from({ length }, (_, i) => (i < override.length ? mergeTexts(base[i], override[i], true) : base[i]));
  }
  if (isObject(override)) {
    if (!isObject(base)) return override;
    const result: Json = { ...base };
    for (const [key, value] of Object.entries(override)) result[key] = mergeTexts(base[key], value, itemwise);
    return result;
  }
  if (base !== undefined && base !== null && typeof base !== typeof override) return base;
  return override;
}

// ---- products & contact ----------------------------------------------------

function toItem(product: Product, data: StorefrontData): Item & BoutiqueItemExtras {
  const { locale } = data;
  const fact = (index: number) => text(product.facts[index]?.value, locale);
  const bespoke = isBespoke(data.tenant);
  const model = bespoke ? ((KRUMBZ_MODELS as readonly string[]).includes(product.slug) ? product.slug : "sachet") : "product";
  const base = {
    id: product.slug,
    model,
    name: text(product.name, locale),
    short: text(product.short, locale),
    description: text(product.description, locale),
    // Facts of a product, in order: the first two are shown on the card (Krumbz: net weight, contents).
    weight: fact(0),
    unitsPerPack: fact(1),
    price: product.price as number,
    // Only displayed when there is no price (« Prix à confirmer »).
    priceDisplay: "",
    compareAtPrice: product.compareAtPrice as number,
    ...(product.promoLabel ? { promoLabel: text(product.promoLabel, locale) } : {}),
  };
  if (bespoke) return base;
  const images = product.images
    .filter((image) => mediaExists(image.url))
    .map((image) => ({ url: image.url, alt: text(image.alt, locale) || base.name, width: image.width, height: image.height }));
  return {
    ...base,
    slug: product.slug,
    featured: product.featured,
    image: images[0] ?? null,
    images,
    modelUrl: mediaExists(product.modelUrl) ? product.modelUrl : null,
    factLabels: [text(product.facts[0]?.label, locale), text(product.facts[1]?.label, locale)],
  };
}

function toContact(base: Contact, data: StorefrontData): Contact {
  const { contact } = data.tenant;
  const isDefaultLocale = data.locale === data.tenant.locales[0];
  return {
    ...base,
    phones: contact.phones.map((e164) => ({ display: formatPhoneDisplay(e164), e164 })),
    whatsapp: { ...base.whatsapp, number: contact.whatsapp, display: formatPhoneDisplay(contact.whatsapp) },
    email: contact.email ?? "",
    address: contact.address ?? "",
    city: contact.city ?? "",
    // Opening hours are a sentence: the DB holds the default-locale one, translations stay in the content.
    hours: isDefaultLocale || !base.hours ? (contact.hours ?? "") : base.hours,
    mapUrl: contact.mapUrl ?? "",
    socials: contact.socials.map((s) => ({
      network: s.network,
      label: SOCIAL_LABELS[s.network.toLowerCase()] ?? s.network,
      url: s.url,
    })),
  };
}

// ---- build -----------------------------------------------------------------

/** Texts of a shop other than Krumbz, before products/contacts. */
function boutiqueTexts(data: StorefrontData): SiteContent {
  const { tenant, locale } = data;
  const content = tenant.content as Json;
  const base = neutralize(loadContent(locale), locale as PlatformLocale, tenant.name);
  const withFr = mergeTexts(base, content.fr, false);
  const merged = (locale === "fr" ? withFr : mergeTexts(withFr, content[locale], true)) as SiteContent;
  // Life-moment scenes: texts of tenant.scenes (the photos and framing are resolved by the home page).
  const scenes = tenant.scenes.map((scene) => ({
    id: scene.id,
    label: text(scene.label, locale),
    title: text(scene.title, locale),
    text: text(scene.text, locale),
    alt: text(scene.alt, locale),
  }));
  return { ...merged, brand: { ...merged.brand, name: tenant.name }, home: { ...merged.home, moments: { ...merged.home.moments, scenes } } };
}

const built = new WeakMap<StorefrontData, SiteContent>();

export function buildStorefrontContent(data: StorefrontData): SiteContent {
  const hit = built.get(data);
  if (hit) return hit;
  let merged: SiteContent;
  if (isBespoke(data.tenant)) {
    const base = loadContent(data.locale);
    const overrides = (data.tenant.content as Json)[data.locale];
    merged = overrides && typeof overrides === "object" ? { ...base, ...(overrides as Partial<SiteContent>) } : base;
  } else {
    merged = boutiqueTexts(data);
  }
  const content: SiteContent = {
    ...merged,
    contact: toContact(merged.contact, data),
    products: { ...merged.products, items: data.products.map((p) => toItem(p, data)) },
  };
  built.set(data, content);
  return content;
}

/** Storefront data of the current request (tenant from the route's root params). */
export async function loadStorefrontData(locale: string): Promise<StorefrontData> {
  const slug = await tenantParam();
  const data = slug ? await getStorefrontData(slug, locale) : null;
  if (!data) notFound();
  return data;
}

/** Content of the current storefront request. */
export async function loadStorefrontContent(locale: string): Promise<SiteContent> {
  return buildStorefrontContent(await loadStorefrontData(locale));
}
