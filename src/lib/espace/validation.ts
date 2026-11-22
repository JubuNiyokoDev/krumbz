/**
 * Vendor space: server-side parsing and validation of the forms (pure functions,
 * no I/O). Every value coming from a form goes through here before reaching
 * forTenant(); errors are codes, translated by the caller (src/espace/messages).
 */
import type { Localized, PlatformLocale, Product, TenantContact } from "../tenant/types.ts";

export type ErrorCode =
  | "required"
  | "too_long"
  | "too_many"
  | "invalid_number"
  | "price_positive"
  | "too_big"
  | "compare_needs_price"
  | "compare_gt_price"
  | "fact_incomplete"
  | "invalid_phone"
  | "invalid_email"
  | "invalid_url"
  | "https_only"
  | "invalid_network"
  | "not_found"
  | "not_image"
  | "too_large"
  | "too_many_images"
  | "password_wrong"
  | "password_mismatch"
  | "password_same"
  | "password_too_short"
  | "password_too_long";

export interface FieldError {
  /** Form field name, e.g. "name.fr", "price", "facts.1.value.fr", "phones.0", or "form". */
  field: string;
  code: ErrorCode;
  max?: number;
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; errors: FieldError[] };

export const LIMITS = {
  name: 80,
  short: 200,
  description: 3000,
  promoLabel: 40,
  factLabel: 40,
  factValue: 80,
  facts: 8,
  alt: 150,
  price: 1_000_000_000,
  email: 120,
  address: 200,
  city: 80,
  hours: 300,
  url: 500,
  phones: 5,
  socials: 8,
  imagesPerProduct: 8,
  filesPerUpload: 4,
} as const;

export const SOCIAL_NETWORKS = ["facebook", "instagram", "tiktok", "youtube", "x", "linkedin", "telegram", "whatsapp"] as const;

export type ProductFormValue = {
  name: Localized;
  short: Localized;
  description: Localized;
  price: number | null;
  compareAtPrice: number | null;
  promoLabel: Localized | null;
  facts: Product["facts"];
  visible: boolean;
};

/* ------------------------------------------------------------------ helpers */

type Form = Pick<FormData, "get" | "has">;

/** Trimmed single string; anything else (File, missing) → "". */
export function field(form: Form, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim() : "";
}

function line(value: string): string {
  return value.replace(/\s+/g, " ");
}

/**
 * Localized text of the tenant's locales. Starts from `base` so that locales the
 * form does not show are preserved; a locale whose field is absent from the
 * form keeps its value, an empty field clears it (fr becomes "").
 */
function localized(
  form: Form,
  prefix: string,
  locales: readonly PlatformLocale[],
  options: { base?: Localized | null; max: number; required?: boolean; multiline?: boolean },
  errors: FieldError[],
): Localized {
  const result: Record<string, string> = { ...(options.base ?? { fr: "" }) };
  for (const locale of new Set<PlatformLocale>(["fr", ...locales])) {
    const key = `${prefix}.${locale}`;
    if (!form.has(key) && !(locale === "fr" && options.required)) continue;
    const raw = field(form, key);
    const value = options.multiline ? raw.replace(/\n{3,}/g, "\n\n") : line(raw);
    if (value.length > options.max) errors.push({ field: key, code: "too_long", max: options.max });
    if (locale === "fr") {
      if (!value && options.required) errors.push({ field: key, code: "required" });
      result.fr = value;
    } else if (value) result[locale] = value;
    else delete result[locale];
  }
  result.fr ??= "";
  return result as Localized;
}

function isEmptyLocalized(value: Localized): boolean {
  return Object.values(value).every((v) => !v);
}

/**
 * Amount in BIF (integer). Accepts "1500", "1 500", "1.500", "1,500", "1500 FBu".
 * Returns null for an empty field, "invalid" otherwise.
 */
export function parseBif(raw: string): number | null | "invalid" {
  const s = raw.replace(/\s*(fbu|bif|f)\s*$/i, "").trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s);
  if (/^\d{1,3}([ .,'\u00a0\u202f]\d{3})+$/.test(s)) return Number(s.replace(/\D/g, ""));
  return "invalid";
}

/** First characters of the French name → URL slug ("Biscuit à l'orange" → "biscuit-a-l-orange"). */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "produit";
}

/**
 * Phone number → digits with country code, or null.
 * - "+…" / "00…": international, 8 to 15 digits (Burundi 257 → exactly 11 digits);
 * - 8 digits without prefix: a Burundi number, 257 is added;
 * - otherwise 9 to 15 digits starting with the country code (Burundi 257 → 11 digits).
 */
export function normalizePhone(raw: string): string | null {
  const compact = raw.trim().replace(/[\s().\-\u00a0]/g, "");
  if (!compact) return null;
  const international = compact.startsWith("+") || compact.startsWith("00");
  const digits = compact.startsWith("+") ? compact.slice(1) : compact.startsWith("00") ? compact.slice(2) : compact;
  if (!/^\d+$/.test(digits)) return null;
  if (!international && digits.length === 8) return `257${digits}`;
  if (digits.startsWith("257")) return digits.length === 11 ? digits : null;
  const min = international ? 8 : 9;
  return digits.length >= min && digits.length <= 15 ? digits : null;
}

/** Login identifier: e-mail (lower-cased) or phone (normalised to +<digits>, 8 digits = Burundi). */
export function canonicalIdentifier(raw: string): string {
  const value = raw.trim();
  if (value.includes("@")) return value.toLowerCase().replace(/\s+/g, "");
  if (/^[+\d\s().\-]+$/.test(value)) {
    const phone = normalizePhone(value);
    if (phone) return `+${phone}`;
  }
  return value.toLowerCase().replace(/\s+/g, "");
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function httpsUrl(raw: string, key: string, errors: FieldError[]): string | null {
  if (!raw) return null;
  if (raw.length > LIMITS.url) {
    errors.push({ field: key, code: "too_long", max: LIMITS.url });
    return null;
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    try {
      // "www.facebook.com/…" typed without the scheme.
      url = new URL(`https://${raw}`);
      if (!url.hostname.includes(".")) throw new Error("no host");
    } catch {
      errors.push({ field: key, code: "invalid_url" });
      return null;
    }
  }
  if (url.protocol !== "https:") {
    errors.push({ field: key, code: "https_only" });
    return null;
  }
  return url.toString();
}

/* ------------------------------------------------------------------ product */

/**
 * Product form → validated values. `base` (the stored product, on update) keeps
 * the locales and facts the form does not show. Slug, featured, modelUrl and
 * sortOrder are never read from the form.
 */
export function parseProductForm(form: Form, locales: readonly PlatformLocale[], base?: Product | null): Parsed<ProductFormValue> {
  const errors: FieldError[] = [];
  const name = localized(form, "name", locales, { base: base?.name, max: LIMITS.name, required: true }, errors);
  const short = localized(form, "short", locales, { base: base?.short, max: LIMITS.short }, errors);
  const description = localized(form, "description", locales, { base: base?.description, max: LIMITS.description, multiline: true }, errors);

  const priceRaw = parseBif(field(form, "price"));
  const compareRaw = parseBif(field(form, "compareAtPrice"));
  let price: number | null = null;
  let compareAtPrice: number | null = null;
  if (priceRaw === "invalid") errors.push({ field: "price", code: "invalid_number" });
  else if (priceRaw !== null && priceRaw <= 0) errors.push({ field: "price", code: "price_positive" });
  else if (priceRaw !== null && priceRaw > LIMITS.price) errors.push({ field: "price", code: "too_big" });
  else price = priceRaw;
  if (compareRaw === "invalid") errors.push({ field: "compareAtPrice", code: "invalid_number" });
  else if (compareRaw !== null && compareRaw > LIMITS.price) errors.push({ field: "compareAtPrice", code: "too_big" });
  else if (compareRaw !== null) {
    if (priceRaw === null) errors.push({ field: "compareAtPrice", code: "compare_needs_price" });
    else if (typeof priceRaw === "number" && compareRaw <= priceRaw) errors.push({ field: "compareAtPrice", code: "compare_gt_price" });
    else compareAtPrice = compareRaw;
  }

  const label = localized(form, "promoLabel", locales, { base: base?.promoLabel, max: LIMITS.promoLabel }, errors);
  const promoLabel = isEmptyLocalized(label) ? null : label;
  // A translated badge without the French one would show nothing on the French storefront.
  if (promoLabel && !promoLabel.fr) errors.push({ field: "promoLabel.fr", code: "required" });

  const facts: Product["facts"] = [];
  for (let index = 0; index < LIMITS.facts; index++) {
    const prefix = `facts.${index}`;
    if (!form.has(`${prefix}.label.fr`) && !form.has(`${prefix}.value.fr`)) continue;
    const before = base?.facts[index];
    const factLabel = localized(form, `${prefix}.label`, locales, { base: before?.label, max: LIMITS.factLabel }, errors);
    const factValue = localized(form, `${prefix}.value`, locales, { base: before?.value, max: LIMITS.factValue }, errors);
    if (!factLabel.fr && !factValue.fr) continue;
    if (!factLabel.fr) errors.push({ field: `${prefix}.label.fr`, code: "fact_incomplete" });
    else if (!factValue.fr) errors.push({ field: `${prefix}.value.fr`, code: "fact_incomplete" });
    else facts.push({ label: factLabel, value: factValue });
  }

  const visible = field(form, "visible") === "1";
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { name, short, description, price, compareAtPrice, promoLabel, facts, visible } };
}

/** Alternative text of a photo ("alt.fr", "alt.rn"…); other locales of `base` are kept. */
export function parseAltForm(form: Form, locales: readonly PlatformLocale[], base?: Localized | null): Parsed<Localized> {
  const errors: FieldError[] = [];
  const alt = localized(form, "alt", locales, { base, max: LIMITS.alt }, errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: alt };
}

/** Non-empty files of a multipart field. */
export function filesOf(form: Pick<FormData, "getAll">, key: string): File[] {
  return form.getAll(key).filter((value): value is File => typeof value === "object" && value !== null && "arrayBuffer" in value && value.size > 0);
}

/* ------------------------------------------------------------------ contacts */

export function parseContactForm(form: Form): Parsed<TenantContact> {
  const errors: FieldError[] = [];

  const whatsappRaw = field(form, "whatsapp");
  const whatsapp = normalizePhone(whatsappRaw);
  if (!whatsappRaw) errors.push({ field: "whatsapp", code: "required" });
  else if (!whatsapp) errors.push({ field: "whatsapp", code: "invalid_phone" });

  const phones: string[] = [];
  for (let index = 0; index < LIMITS.phones; index++) {
    const raw = field(form, `phones.${index}`);
    if (!raw) continue;
    const phone = normalizePhone(raw);
    if (!phone) errors.push({ field: `phones.${index}`, code: "invalid_phone" });
    else if (!phones.includes(`+${phone}`)) phones.push(`+${phone}`);
  }

  const text = (key: "address" | "city" | "hours", max: number): string | null => {
    const value = line(field(form, key));
    if (value.length > max) errors.push({ field: key, code: "too_long", max });
    return value || null;
  };

  const emailRaw = field(form, "email").toLowerCase();
  let email: string | null = null;
  if (emailRaw.length > LIMITS.email) errors.push({ field: "email", code: "too_long", max: LIMITS.email });
  else if (emailRaw && !EMAIL.test(emailRaw)) errors.push({ field: "email", code: "invalid_email" });
  else email = emailRaw || null;

  const address = text("address", LIMITS.address);
  const city = text("city", LIMITS.city);
  const hours = text("hours", LIMITS.hours);
  const mapUrl = httpsUrl(field(form, "mapUrl"), "mapUrl", errors);

  const socials: TenantContact["socials"] = [];
  for (let index = 0; index < LIMITS.socials; index++) {
    const network = field(form, `socials.${index}.network`);
    const rawUrl = field(form, `socials.${index}.url`);
    if (!rawUrl) continue;
    if (!(SOCIAL_NETWORKS as readonly string[]).includes(network)) {
      errors.push({ field: `socials.${index}.network`, code: "invalid_network" });
      continue;
    }
    const url = httpsUrl(rawUrl, `socials.${index}.url`, errors);
    if (url) socials.push({ network, url });
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { whatsapp: whatsapp!, phones, email, address, city, hours, mapUrl, socials } };
}
