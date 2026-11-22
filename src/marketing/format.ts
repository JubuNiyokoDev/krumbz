import type { MarketingLocale } from "./types";

/** Burundi groups thousands with spaces (fr/rn); en/sw use commas. */
const NUMBER_LOCALE: Record<MarketingLocale, string> = { fr: "fr-FR", rn: "fr-FR", en: "en-US", sw: "en-US" };

export function formatAmount(value: number, locale: MarketingLocale): string {
  // U+00A0 instead of the narrow U+202F: never a missing glyph, never a line break inside the price.
  return new Intl.NumberFormat(NUMBER_LOCALE[locale], { maximumFractionDigits: 0 })
    .format(value)
    .replace(/[\u202f\u00a0 ]/g, "\u00a0");
}

/** Host name of a shop URL, for display ("krumbz.rundinova.com"). */
export function displayHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function whatsappUrl(number: string, text?: string): string {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
