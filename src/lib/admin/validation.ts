/**
 * Small typed validators of the super-admin (no schema library: the rules are few).
 * Pure functions, French messages. Relative imports carry `.ts` (node --test runs them directly).
 */
import { PLATFORM_LOCALES, RESERVED_SLUGS, SLUG_PATTERN, type Localized, type PlatformLocale } from "../tenant/types.ts";

export type FieldErrors = Record<string, string>;

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/** Lower-cases, trims and turns spaces / underscores into dashes (what the vendor probably meant). */
export function normalizeSlug(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

/** Suggestion from a shop name: "Chaussures Ikirenge" → "chaussures-ikirenge". */
export function slugFromName(name: string): string {
  return normalizeSlug(name)
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .replace(/-+$/g, "");
}

/** Why a sub-domain cannot be used (format, reserved), or null. Uniqueness is checked against the database. */
export function slugProblem(slug: string): string | null {
  if (!slug) return "Le sous-domaine est obligatoire.";
  if (slug.startsWith("staging-") || slug === "staging") return "Le préfixe « staging- » est réservé à la préproduction.";
  if (!SLUG_PATTERN.test(slug)) {
    return "De 3 à 32 caractères : lettres minuscules sans accent, chiffres et tirets (pas de tiret au début ni à la fin).";
  }
  if (slug.includes("--")) return "Pas de double tiret dans le sous-domaine.";
  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) return `« ${slug} » est réservé (plateforme ou autre projet).`;
  return null;
}

export function isPlatformLocale(value: unknown): value is PlatformLocale {
  return typeof value === "string" && (PLATFORM_LOCALES as readonly string[]).includes(value);
}

/** fr first (mandatory), then the others in the platform order, without duplicates. */
export function normalizeLocales(values: unknown[]): PlatformLocale[] {
  const wanted = new Set(values.filter(isPlatformLocale));
  return PLATFORM_LOCALES.filter((locale) => locale === "fr" || wanted.has(locale));
}

export const LOCALE_LABELS: Record<PlatformLocale, string> = { fr: "Français", rn: "Kirundi", en: "Anglais", sw: "Swahili" };

/** WhatsApp number: digits only with the country code (8 to 15 digits), e.g. 25768497372. */
export function parseWhatsapp(raw: string): string | null {
  const digits = raw.replace(/[\s().-]/g, "").replace(/^\+/, "").replace(/^00/, "");
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;

/** Login identifier of a vendor: an e-mail (lower-cased) or a phone number (digits with country code). */
export function parseIdentifier(raw: string): string | null {
  const value = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!value) return null;
  if (value.includes("@")) return EMAIL.test(value) ? value : null;
  return parseWhatsapp(value);
}

export function parseEmail(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  return EMAIL.test(value) ? value : null;
}

/** Integer amount in BIF within bounds, or null. Accepts "10 000", "10000", "10.000". */
export function parseAmount(raw: string, { min = 0, max = 100_000_000 }: { min?: number; max?: number } = {}): number | null {
  const cleaned = raw.replace(/[\s.\u202f\u00a0]/g, "").replace(/(fbu|bif)$/i, "");
  if (!/^\d{1,9}$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return value >= min && value <= max ? value : null;
}

export function parseInteger(raw: string, min: number, max: number): number | null {
  if (!/^-?\d{1,9}$/.test(raw.trim())) return null;
  const value = Number(raw.trim());
  return value >= min && value <= max ? value : null;
}

/** "2026-11-22" (input type=date) → Date at 00:00 UTC, or null. */
export function parseDateInput(raw: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Trimmed text with a length cap; control characters (except new lines) removed. */
export function cleanText(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);
}

/**
 * Localized text from per-locale strings: empty locales are dropped, fr is required
 * (returns null when fr is empty and `required` is false, an error string when required).
 */
export function toLocalized(values: Partial<Record<PlatformLocale, string>>, max: number): Localized | null {
  const fr = cleanText(values.fr, max);
  if (!fr) return null;
  const out: Localized = { fr };
  for (const locale of PLATFORM_LOCALES) {
    if (locale === "fr") continue;
    const value = cleanText(values[locale], max);
    if (value) out[locale] = value;
  }
  return out;
}

/** Reads a FormData as plain strings (files and repeated keys handled by the caller). */
export function formText(form: FormData, name: string, max = 500): string {
  return cleanText(form.get(name), max);
}
