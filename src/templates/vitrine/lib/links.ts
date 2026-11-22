import { PLATFORM_LOCALES, type PlatformLocale } from "@/lib/tenant/types";

export type VitrinePage = "home" | "products" | "product" | "order" | "contact";

export interface VitrineTarget {
  page: VitrinePage;
  productSlug?: string;
  locale: PlatformLocale;
  /** In-page anchor, without "#". */
  hash?: string;
}

/**
 * Public URL scheme of a vitrine storefront, mirroring next-intl `pathnames`
 * with `localePrefix: "as-needed"`: French is unprefixed, the other locales are
 * prefixed (`/en/products`, `/sw/bidhaa/<slug>`…).
 */
export const VITRINE_PATHNAMES: Record<Exclude<VitrinePage, "home" | "product">, Record<PlatformLocale, string>> = {
  products: { fr: "produits", en: "products", rn: "ibicuruzwa", sw: "bidhaa" },
  order: { fr: "commander", en: "order", rn: "gutumiza", sw: "agiza" },
  contact: { fr: "contact", en: "contact", rn: "itumanaho", sw: "mawasiliano" },
};

export const VITRINE_DEFAULT_LOCALE: PlatformLocale = "fr";

/** Builds a storefront URL from the target page. */
export type VitrineLinkBuilder = (target: VitrineTarget) => string;

/**
 * THE link helper of the template: every internal href goes through it.
 * `basePath` is where the storefront is mounted ("" on a vendor sub-domain,
 * "/demo-vitrine" for the dev preview), without trailing slash.
 */
export function vitrineHref(basePath: string, target: VitrineTarget, defaultLocale: PlatformLocale = VITRINE_DEFAULT_LOCALE): string {
  const { page, productSlug, locale, hash } = target;
  const parts: string[] = [];
  const base = basePath.replace(/\/+$/, "");
  if (base) parts.push(base.replace(/^\/+/, ""));
  if (locale !== defaultLocale) parts.push(locale);
  if (page === "products" || page === "product") parts.push(VITRINE_PATHNAMES.products[locale]);
  if (page === "product" && productSlug) parts.push(encodeURIComponent(productSlug));
  if (page === "order" || page === "contact") parts.push(VITRINE_PATHNAMES[page][locale]);
  return `/${parts.join("/")}${hash ? `#${hash}` : ""}`;
}

export function createLinkBuilder(basePath = "", defaultLocale: PlatformLocale = VITRINE_DEFAULT_LOCALE): VitrineLinkBuilder {
  return (target) => vitrineHref(basePath, target, defaultLocale);
}

export interface ParsedVitrinePath {
  locale: PlatformLocale;
  page: VitrinePage;
  productSlug?: string;
}

/**
 * Inverse of `vitrineHref` for the path segments after `basePath`
 * (e.g. ["en", "products", "runner"]). Returns null for an unknown path, so
 * the caller can answer 404.
 */
export function parseVitrinePath(segments: readonly string[] = [], defaultLocale: PlatformLocale = VITRINE_DEFAULT_LOCALE): ParsedVitrinePath | null {
  const parts = segments.map((s) => decodeURIComponent(s)).filter(Boolean);
  let locale = defaultLocale;
  if (parts[0] && (PLATFORM_LOCALES as readonly string[]).includes(parts[0]) && parts[0] !== defaultLocale) {
    locale = parts.shift() as PlatformLocale;
  }
  const [first, second, ...rest] = parts;
  if (rest.length > 0) return null;
  if (first === undefined) return { locale, page: "home" };
  if (first === VITRINE_PATHNAMES.products[locale]) {
    return second === undefined ? { locale, page: "products" } : { locale, page: "product", productSlug: second };
  }
  if (second !== undefined) return null;
  if (first === VITRINE_PATHNAMES.order[locale]) return { locale, page: "order" };
  if (first === VITRINE_PATHNAMES.contact[locale]) return { locale, page: "contact" };
  return null;
}

/** Resolved hrefs handed to client components (functions cannot cross the server/client boundary). */
export interface ResolvedLinks {
  home: string;
  products: string;
  order: string;
  contact: string;
  product: Record<string, string>; // slug → href
  /** Same page in every enabled locale (language switcher). */
  locales: { locale: PlatformLocale; href: string }[];
}
