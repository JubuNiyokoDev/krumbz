import { headers } from "next/headers";
import { routing, type AppPathname } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { LOCALE_LABELS } from "@/i18n/config";
import { getStorefrontData } from "@/lib/tenant/storefront";
import { isLocalHost, normalizeHost, publicOrigin } from "@/lib/tenant/hosts";
import { requestHostHeader } from "@/lib/tenant/request-host";
import { buildStorefrontContent } from "@/templates/boutique/content";

/** Relative importance of each page (every page in routing.pathnames must be listed). */
const PAGES: Record<AppPathname, { priority: number; changeFrequency: string }> = {
  "/": { priority: 1, changeFrequency: "weekly" },
  "/produits": { priority: 0.9, changeFrequency: "weekly" },
  "/commander": { priority: 0.8, changeFrequency: "monthly" },
  "/notre-histoire": { priority: 0.7, changeFrequency: "monthly" },
  "/contact": { priority: 0.6, changeFrequency: "monthly" },
  "/mentions-legales": { priority: 0.2, changeFrequency: "yearly" },
};

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * <shop host>/sitemap.xml (src/proxy.ts → /tpl/boutique/<slug>/sitemap.xml): the pages that exist for THIS shop
 * (story / legal only when they have content), in the shop's locales, each with its hreflang alternates
 * (+ x-default = French). URLs use the request host (https), PLATFORM_ROOT_DOMAIN as a fallback.
 */
export async function GET(_request: Request, { params }: RouteContext<"/tpl/boutique/[tenant]/sitemap.xml">) {
  const { tenant: slug } = await params;
  const data = await getStorefrontData(slug, routing.defaultLocale);
  if (!data || data.tenant.status === "paused") return new Response("Not found", { status: 404 });

  const h = await headers();
  const host = normalizeHost(requestHostHeader(h));
  const local = isLocalHost(host);
  const port = local ? (requestHostHeader(h)?.split(":")[1] ?? "") : "";
  const origin = host ? `${local ? "http" : "https"}://${host}${port ? `:${port}` : ""}` : publicOrigin(slug);

  const content = buildStorefrontContent(data);
  const hidden = new Set<AppPathname>();
  if (!content.story.title) hidden.add("/notre-histoire");
  if (!content.legal.sections.length) hidden.add("/mentions-legales");
  const locales = routing.locales.filter((l) => (data.tenant.locales as string[]).includes(l));
  const fallback = locales.includes(routing.defaultLocale) ? routing.defaultLocale : locales[0];
  const url = (locale: (typeof routing.locales)[number], href: AppPathname) => new URL(getPathname({ locale, href }), origin).toString();

  const entries = (Object.keys(routing.pathnames) as AppPathname[])
    .filter((href) => !hidden.has(href))
    .flatMap((href) => {
      const links = [
        ...locales.map((l) => `<xhtml:link rel="alternate" hreflang="${LOCALE_LABELS[l].htmlLang}" href="${escape(url(l, href))}" />`),
        `<xhtml:link rel="alternate" hreflang="x-default" href="${escape(url(fallback, href))}" />`,
      ].join("\n");
      return locales.map(
        (locale) =>
          `<url>\n<loc>${escape(url(locale, href))}</loc>\n${links}\n<changefreq>${PAGES[href].changeFrequency}</changefreq>\n<priority>${PAGES[href].priority}</priority>\n</url>`,
      );
    });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml", "cache-control": "public, max-age=3600" } });
}
