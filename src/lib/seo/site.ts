import type { Metadata } from "next";
import { routing, type AppPathname } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { LOCALE_LABELS, type Locale } from "@/i18n/config";
import type { loadContent } from "@/lib/content";
import { buildStorefrontContent, isBespoke, loadStorefrontData } from "@/templates/boutique/content";
import { storefrontMedia } from "@/lib/storefront/media";
import { ogImage, ogImageUrl, shopOgImage } from "./og";

/**
 * Public site URL. Set NEXT_PUBLIC_SITE_URL in Vercel once the domain is known
 * (À COMPLÉTER); Vercel's production URL is used meanwhile.
 */
export function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL(`http://localhost:${process.env.PORT ?? 3000}`);
}

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString();
}

export function localizedPath(locale: Locale, href: AppPathname): string {
  return getPathname({ locale, href });
}

type PageKey = keyof ReturnType<typeof loadContent>["seo"]["pages"];

/** Metadata for a page of the current shop: title, description, canonical, hreflang alternates, Open Graph, Twitter. */
export async function pageMetadata(locale: Locale, page: PageKey, href: AppPathname): Promise<Metadata> {
  const data = await loadStorefrontData(locale);
  const content = buildStorefrontContent(data);
  const { title, description } = content.seo.pages[page];
  const bespoke = isBespoke(data.tenant);
  // Krumbz: its share image (or the generated card); other shops: media.og, else their product photo.
  const image = bespoke ? ogImage(content.seo.ogAlt) : shopOgImage(storefrontMedia(data), content.seo.ogAlt);
  const canonical = localizedPath(locale, href);
  const languages = Object.fromEntries(routing.locales.map((l) => [LOCALE_LABELS[l].htmlLang, localizedPath(l, href)]));
  return {
    title: page === "home" ? { absolute: title } : title,
    description,
    alternates: { canonical, languages: { ...languages, "x-default": localizedPath(routing.defaultLocale, href) } },
    openGraph: {
      type: "website",
      siteName: content.seo.siteName,
      locale: LOCALE_LABELS[locale].ogLocale,
      url: canonical,
      title: page === "home" ? title : `${title} · ${content.seo.siteName}`,
      description,
      images: image ? [image] : [],
    },
    twitter: { card: "summary_large_image", title, description, images: bespoke ? [ogImageUrl()] : image ? [image.url] : [] },
  };
}
