/**
 * Messages of the vendor space (FR + Kirundi). Server code reads them directly
 * (typed); client components only receive ready-made strings, so no message
 * catalogue is shipped to the phone. The same files are registered as the
 * "espace" namespace of next-intl (src/i18n/platform-messages.ts).
 */
import type { FieldError } from "@/lib/espace/validation";
import fr from "./messages/fr.json";
import rn from "./messages/rn.json";

export const ESPACE_LOCALES = ["fr", "rn"] as const;
export type EspaceLocale = (typeof ESPACE_LOCALES)[number];
export type EspaceMessages = typeof fr;

const MESSAGES: Record<EspaceLocale, EspaceMessages> = { fr, rn };

export function espaceLocale(value: unknown): EspaceLocale {
  return value === "rn" ? "rn" : "fr";
}

export function espaceMessages(locale: string): EspaceMessages {
  return MESSAGES[espaceLocale(locale)];
}

/** "{name}" placeholders. */
export function format(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

/** Readable label of a form field name ("name.rn" → "Nom (Kirundi)", "phones.1" → "Téléphone 2"). */
export function fieldLabel(m: EspaceMessages, name: string): string {
  const parts = name.split(".");
  const locale = parts[parts.length - 1];
  const inLocale = (label: string) =>
    locale in m.locales && locale !== "fr" ? `${label} (${m.locales[locale as keyof EspaceMessages["locales"]]})` : label;
  const n = Number(parts[1]) + 1;
  switch (parts[0]) {
    case "name":
    case "short":
    case "description":
    case "promoLabel":
      return inLocale(m.product[parts[0]]);
    case "price":
    case "compareAtPrice":
      return m.product[parts[0]];
    case "facts":
      return inLocale(format(parts[2] === "value" ? m.product.factValue : m.product.factLabel, { n }));
    case "alt":
      return inLocale(m.photos.alt);
    case "whatsapp":
    case "email":
    case "address":
    case "city":
    case "hours":
    case "mapUrl":
      return m.contacts[parts[0]];
    case "phones":
      return format(m.contacts.phone, { n });
    case "socials":
      return format(parts[2] === "network" ? m.contacts.network : m.contacts.socialUrl, { n });
    default:
      return name in m.fields ? m.fields[name as keyof EspaceMessages["fields"]] : name;
  }
}

export function errorMessages(m: EspaceMessages, errors: FieldError[]): string[] {
  return errors.map((error) => {
    const text = format(m.errors[error.code], { max: error.max ?? "" });
    return error.field === "form" ? text.charAt(0).toUpperCase() + text.slice(1) : `${fieldLabel(m, error.field)} : ${text}`;
  });
}

export function formatBif(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} FBu`;
}

export function formatDate(date: Date, locale: EspaceLocale): string {
  try {
    return new Intl.DateTimeFormat(locale === "rn" ? "rn-BI" : "fr-BI", { dateStyle: "long", timeZone: "Africa/Bujumbura" }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
