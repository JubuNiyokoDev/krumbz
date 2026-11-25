import type { Metadata } from "next";
import { getMarketingContent } from "./content";
import { MARKETING_LOCALES, type MarketingLocale } from "./types";
import { publicOrigin } from "@/lib/tenant/hosts";

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
    // Public origin of this deployment (isoko / staging-isoko on PLATFORM_ROOT_DOMAIN).
    metadataBase: new URL(publicOrigin("isoko")),
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
      images: [{ url: "/brand/rundinova-og.png", width: 1200, height: 630, alt: c.meta.siteName }],
    },
    twitter: { card: "summary_large_image", title: c.meta.title, description: c.meta.description, images: ["/brand/rundinova-og.png"] },
    formatDetection: { telephone: false },
    // RundiNova Tech icons (scripts/brand-rundinova.mjs), never the Krumbz ones.
    icons: {
      icon: [
        { url: "/brand/rn-icon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/brand/rn-icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: [{ url: "/brand/rn-icon-180.png", sizes: "180x180", type: "image/png" }],
    },
  };
}

export const RUNDINOVA_THEME_COLOR = "#ffffff";

/** <html lang> per locale (Kirundi = "rn"). */
export const MARKETING_HTML_LANG: Record<MarketingLocale, string> = { fr: "fr", rn: "rn", en: "en", sw: "sw" };
