import { defineRouting } from "next-intl/routing";
import { PLATFORM_LOCALES } from "@/lib/tenant/types";

/**
 * Routing of the platform areas (not the storefronts, see ./routing.ts).
 * The proxy applies them on their host, then prefixes the internal route tree:
 *   isoko.<root>  → /marketing/[locale]/…   (fr without prefix, /rn /en /sw)
 *   espace.<root> → /espace/[locale]/…      (fr without prefix, /rn)
 *   admin.<root>  → /admin/…                (French only, no locale segment)
 * Navigation helpers: createNavigation(marketingRouting) / createNavigation(espaceRouting).
 */
export const marketingRouting = defineRouting({
  locales: PLATFORM_LOCALES,
  defaultLocale: "fr",
  localePrefix: "as-needed",
  localeDetection: false,
});

export const espaceRouting = defineRouting({
  locales: ["fr", "rn"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
  localeDetection: false,
});
