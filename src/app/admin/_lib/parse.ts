import "server-only";
import { CONTENT_FIELDS, setAtPath } from "@/lib/admin/content";
import { COLOR_FIELDS, validateTheme } from "@/lib/admin/theme";
import { cleanText, formText, isHttpUrl, normalizeLocales, parseEmail, parseWhatsapp, toLocalized } from "@/lib/admin/validation";
import { FEATURE_KEYS } from "@/lib/db/mappers";
import { PLATFORM_LOCALES, type PlatformLocale, type TenantContact, type TenantFeatures, type TenantTheme } from "@/lib/tenant/types";

/** Form → domain values shared by the creation wizard and the vendor pages. Field names are documented in the forms. */

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function fileOf(form: FormData, name: string): File | null {
  const value = form.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}

export function imageProblem(file: File | null, required = false): string | null {
  if (!file) return required ? "Choisissez une image." : null;
  if (file.size > MAX_IMAGE_BYTES) return "Image trop lourde (8 Mo maximum).";
  if (file.type && !file.type.startsWith("image/")) return "Ce fichier n'est pas une image (JPEG, PNG, WebP, AVIF).";
  return null;
}

export function parseLocales(form: FormData): PlatformLocale[] {
  return normalizeLocales(form.getAll("locales"));
}

/** Fields color.<key>, fontDisplay, fontBody, radius. */
export function parseTheme(form: FormData, logoUrl: string | null): { theme: TenantTheme; errors: string[] } {
  const colors: Record<string, string> = {};
  for (const { key } of COLOR_FIELDS) colors[key] = formText(form, `color.${key}`, 7);
  return validateTheme({ colors, display: formText(form, "fontDisplay", 60), body: formText(form, "fontBody", 60), radius: formText(form, "radius", 10) }, logoUrl);
}

/** Fields whatsapp, email, phones (comma / new line separated), address, city, hours, mapUrl. */
export function parseContact(form: FormData, previous?: TenantContact): { contact: TenantContact; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  const whatsapp = parseWhatsapp(formText(form, "whatsapp", 30));
  if (!whatsapp) fields.whatsapp = "Numéro WhatsApp invalide : chiffres avec l'indicatif du pays, ex. 25768497372.";
  const rawEmail = formText(form, "email", 200);
  const email = rawEmail ? parseEmail(rawEmail) : null;
  if (rawEmail && !email) fields.email = "Adresse e-mail invalide.";
  const phones: string[] = [];
  for (const raw of formText(form, "phones", 300).split(/[,\n;]+/).map((p) => p.trim()).filter(Boolean)) {
    const digits = parseWhatsapp(raw);
    if (!digits) fields.phones = `Téléphone invalide : « ${raw} ».`;
    else phones.push(`+${digits}`);
  }
  const mapUrl = formText(form, "mapUrl", 500);
  if (mapUrl && !isHttpUrl(mapUrl)) fields.mapUrl = "Lien de carte invalide (https://…).";
  return {
    contact: {
      whatsapp: whatsapp ?? "",
      phones: phones.slice(0, 5),
      email,
      address: formText(form, "address", 200) || null,
      city: formText(form, "city", 80) || null,
      hours: formText(form, "hours", 200) || null,
      mapUrl: mapUrl || null,
      socials: previous?.socials ?? [],
    },
    fields,
  };
}

/** Checkboxes feature.<key>. */
export function parseFeatures(form: FormData): TenantFeatures {
  return Object.fromEntries(FEATURE_KEYS.map((key) => [key, form.get(`feature.${key}`) === "on"])) as TenantFeatures;
}

/**
 * Guided texts: fields content.<key>.<locale> for the known keys (CONTENT_FIELDS).
 * Keys present in the form replace the stored value (empty fr = removed); other keys are kept.
 */
export function mergeContentForm(form: FormData, content: Record<string, unknown>): { content: Record<string, unknown>; fields: Record<string, string> } {
  let next = content;
  const fields: Record<string, string> = {};
  for (const field of CONTENT_FIELDS) {
    const values: Partial<Record<PlatformLocale, string>> = {};
    let present = false;
    for (const locale of PLATFORM_LOCALES) {
      const raw = form.get(`content.${field.key}.${locale}`);
      if (raw === null) continue;
      present = true;
      values[locale] = cleanText(raw, field.max);
    }
    if (!present) continue;
    const localized = toLocalized(values, field.max);
    if (!localized && Object.values(values).some(Boolean)) {
      fields[`content.${field.key}`] = `« ${field.label} » : le texte français est obligatoire dès qu'une traduction est saisie.`;
      continue;
    }
    next = setAtPath(next, field.key, localized);
  }
  return { content: next, fields };
}

/** Localized text of a field group <prefix>.<locale>. */
export function localizedField(form: FormData, prefix: string, max: number) {
  const values: Partial<Record<PlatformLocale, string>> = {};
  for (const locale of PLATFORM_LOCALES) values[locale] = cleanText(form.get(`${prefix}.${locale}`), max);
  return toLocalized(values, max);
}
