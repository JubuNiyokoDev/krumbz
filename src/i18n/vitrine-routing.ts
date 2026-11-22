import { defineRouting } from "next-intl/routing";
import { PLATFORM_LOCALES } from "../lib/tenant/types.ts";

/**
 * Public URLs of the generic « vitrine » storefronts (src/templates/vitrine/lib/links.ts builds the
 * same paths). French slugs are canonical; fr unprefixed, /rn /en /sw. Krumbz keeps ./routing.ts.
 */
export const vitrineRouting = defineRouting({
  locales: PLATFORM_LOCALES,
  defaultLocale: "fr",
  localePrefix: "as-needed",
  localeDetection: false,
  pathnames: {
    "/": "/",
    "/produits": { fr: "/produits", en: "/products", rn: "/ibicuruzwa", sw: "/bidhaa" },
    "/produits/[slug]": { fr: "/produits/[slug]", en: "/products/[slug]", rn: "/ibicuruzwa/[slug]", sw: "/bidhaa/[slug]" },
    "/commander": { fr: "/commander", en: "/order", rn: "/gutumiza", sw: "/agiza" },
    "/contact": { fr: "/contact", en: "/contact", rn: "/itumanaho", sw: "/mawasiliano" },
  },
});

export type VitrinePathname = keyof typeof vitrineRouting.pathnames;
