import type { Metadata } from "next";
import { getMarketingContent } from "./content";
import { MARKETING_LOCALES, type MarketingLocale } from "./types";

/** Public address of the marketing site (owner decision: rundinova.com stays the company site). */
export const MARKETING_ORIGIN = "https://isoko.rundinova.com";

/** Default URL scheme: FR at the root, other locales prefixed (/rn, /en, /sw). */
export function marketingPath(locale: MarketingLocale): string {
  return locale === "fr" ? "/" : `/${locale}`;
}

/** Language-switcher targets: { fr: "/", rn: "/rn", en: "/en", sw: "/sw" }. */
export function marketingLocaleHrefs(): Record<MarketingLocale, string> {
  return Object.fromEntries(MARKETING_LOCALES.map((l) => [l, marketingPath(l)])) as Record<MarketingLocale, string>;
}

/**
 * Metadata for the marketing home. The routing owner can pass its own paths;
 * by default FR is at "/" and the others at "/<locale>".
 */
export function rundinovaMetadata(
  locale: MarketingLocale,
  paths: Partial<Record<MarketingLocale, string>> = {},
): Metadata {
  const c = getMarketingContent(locale);
  const path = (l: MarketingLocale) => paths[l] ?? marketingPath(l);
  const languages: Record<string, string> = {};
  for (const l of MARKETING_LOCALES) languages[l] = path(l);
  languages["x-default"] = path("fr");

  return {
    metadataBase: new URL(MARKETING_ORIGIN),
    title: c.meta.title,
    description: c.meta.description,
    applicationName: c.meta.siteName,
    alternates: { canonical: path(locale), languages },
    openGraph: {
      type: "website",
      siteName: c.meta.siteName,
      title: c.meta.title,
      description: c.meta.description,
      url: path(locale),
      locale: { fr: "fr_BI", rn: "rn_BI", en: "en_GB", sw: "sw_TZ" }[locale],
    },
    twitter: { card: "summary_large_image", title: c.meta.title, description: c.meta.description },
    formatDetection: { telephone: false },
  };
}

export const RUNDINOVA_THEME_COLOR = "#0d0c12";

/** <html lang> per locale (Kirundi = "rn"). */
export const MARKETING_HTML_LANG: Record<MarketingLocale, string> = { fr: "fr", rn: "rn", en: "en", sw: "sw" };
