import { defineRouting } from "next-intl/routing";
import { ACTIVE_LOCALES, DEFAULT_LOCALE } from "./config";

/**
 * Localized pathnames: French slugs are the canonical ones.
 * Add an entry here for every new page.
 */
export const routing = defineRouting({
  locales: ACTIVE_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
  localeDetection: false,
  pathnames: {
    "/": "/",
    "/produits": { fr: "/produits", en: "/products" },
    "/notre-histoire": { fr: "/notre-histoire", en: "/our-story" },
    "/commander": { fr: "/commander", en: "/order" },
    "/contact": { fr: "/contact", en: "/contact" },
    "/mentions-legales": { fr: "/mentions-legales", en: "/legal-notice" },
  },
});

export type AppPathname = keyof typeof routing.pathnames;
