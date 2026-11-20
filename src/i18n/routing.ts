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
    "/produits": { fr: "/produits", en: "/products", rn: "/ibicuruzwa", sw: "/bidhaa" },
    "/notre-histoire": { fr: "/notre-histoire", en: "/our-story", rn: "/inkuru-yacu", sw: "/historia-yetu" },
    "/commander": { fr: "/commander", en: "/order", rn: "/gutumiza", sw: "/agiza" },
    "/contact": { fr: "/contact", en: "/contact", rn: "/itumanaho", sw: "/mawasiliano" },
    "/mentions-legales": { fr: "/mentions-legales", en: "/legal-notice", rn: "/amabwirizwa", sw: "/taarifa-za-kisheria" },
  },
});

export type AppPathname = keyof typeof routing.pathnames;
