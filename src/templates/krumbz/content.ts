/**
 * Krumbz template (vendor #1): its texts stay in content/site.*.json, while
 * products, prices, promos, WhatsApp and contacts come from the database.
 * buildKrumbzContent() overlays the tenant's data onto the static content, so
 * every Krumbz component keeps reading the same SiteContent shape
 * (server: loadKrumbzContent(locale), client: next-intl messages).
 */
import "server-only";
import { tenant as tenantParam } from "next/root-params";
import { notFound } from "next/navigation";
import { loadContent, type SiteContent } from "@/lib/content";
import { getStorefrontData } from "@/lib/tenant/storefront";
import type { Localized, Product, StorefrontData } from "@/lib/tenant/types";

type Item = SiteContent["products"]["items"][number];
type Contact = SiteContent["contact"];

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

function text(value: Localized | null | undefined, locale: string): string {
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

function toItem(product: Product, locale: string): Item & { promoLabel?: string } {
  const fact = (index: number) => text(product.facts[index]?.value, locale);
  const model = (KRUMBZ_MODELS as readonly string[]).includes(product.slug) ? product.slug : "sachet";
  return {
    id: product.slug,
    model,
    name: text(product.name, locale),
    short: text(product.short, locale),
    description: text(product.description, locale),
    // Facts of a Krumbz product, in order: net weight, contents.
    weight: fact(0),
    unitsPerPack: fact(1),
    price: product.price as number,
    // Only displayed when there is no price (« Prix à confirmer »).
    priceDisplay: "",
    compareAtPrice: product.compareAtPrice as number,
    ...(product.promoLabel ? { promoLabel: text(product.promoLabel, locale) } : {}),
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
    // Opening hours are a sentence: the DB holds the default-locale one, translations stay in the content files.
    hours: isDefaultLocale || !base.hours ? (contact.hours ?? "") : base.hours,
    mapUrl: contact.mapUrl ?? "",
    socials: contact.socials.map((s) => ({ network: s.network, label: SOCIAL_LABELS[s.network] ?? s.network, url: s.url })),
  };
}

const built = new WeakMap<StorefrontData, SiteContent>();

export function buildKrumbzContent(data: StorefrontData): SiteContent {
  const hit = built.get(data);
  if (hit) return hit;
  const base = loadContent(data.locale);
  const overrides = (data.tenant.content as Record<string, unknown>)[data.locale];
  const merged: SiteContent = overrides && typeof overrides === "object" ? { ...base, ...(overrides as Partial<SiteContent>) } : base;
  const content: SiteContent = {
    ...merged,
    contact: toContact(merged.contact, data),
    products: { ...merged.products, items: data.products.map((p) => toItem(p, data.locale)) },
  };
  built.set(data, content);
  return content;
}

/** Content of the current Krumbz storefront request (tenant from the route's root params). */
export async function loadKrumbzContent(locale: string): Promise<SiteContent> {
  const slug = await tenantParam();
  const data = slug ? await getStorefrontData(slug, locale) : null;
  if (!data) notFound();
  return buildKrumbzContent(data);
}
