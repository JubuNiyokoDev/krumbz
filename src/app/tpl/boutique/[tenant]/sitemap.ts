import type { MetadataRoute } from "next";
import { routing, type AppPathname } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { LOCALE_LABELS } from "@/i18n/config";
import { absoluteUrl } from "@/lib/seo/site";

/** Relative importance of each page (every page in routing.pathnames must be listed). */
const PAGES: Record<AppPathname, { priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = {
  "/": { priority: 1, changeFrequency: "weekly" },
  "/produits": { priority: 0.9, changeFrequency: "weekly" },
  "/commander": { priority: 0.8, changeFrequency: "monthly" },
  "/notre-histoire": { priority: 0.7, changeFrequency: "monthly" },
  "/contact": { priority: 0.6, changeFrequency: "monthly" },
  "/mentions-legales": { priority: 0.2, changeFrequency: "yearly" },
};

const url = (locale: (typeof routing.locales)[number], href: AppPathname) => absoluteUrl(getPathname({ locale, href }));

/**
 * /sitemap.xml — every page in every active locale, each entry carrying the
 * hreflang alternates of all locales (+ x-default = French).
 * Inactive locales (rn) are left out until they are activated in src/i18n/config.ts.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const hrefs = Object.keys(routing.pathnames) as AppPathname[];
  return hrefs.flatMap((href) => {
    const languages = Object.fromEntries([
      ...routing.locales.map((l) => [LOCALE_LABELS[l].htmlLang, url(l, href)]),
      ["x-default", url(routing.defaultLocale, href)],
    ]);
    return routing.locales.map((locale) => ({
      url: url(locale, href),
      changeFrequency: PAGES[href].changeFrequency,
      priority: PAGES[href].priority,
      alternates: { languages },
    }));
  });
}
