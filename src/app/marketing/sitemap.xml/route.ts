import { headers } from "next/headers";
import { isLocalHost, normalizeHost, publicOrigin } from "@/lib/tenant/hosts";
import { requestHostHeader } from "@/lib/tenant/request-host";
import { MARKETING_LOCALES, marketingPath } from "@/marketing";

/** isoko.rundinova.com/sitemap.xml (src/proxy.ts): the home in each locale, with hreflang alternates, on the request host. */
export async function GET() {
  const h = await headers();
  const host = normalizeHost(requestHostHeader(h));
  const local = isLocalHost(host);
  const port = local ? (requestHostHeader(h)?.split(":")[1] ?? "") : "";
  const origin = host ? `${local ? "http" : "https"}://${host}${port ? `:${port}` : ""}` : publicOrigin("isoko");
  const url = (path: string) => new URL(path, origin).toString();
  const links = [
    ...MARKETING_LOCALES.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${url(marketingPath(l))}" />`),
    `<xhtml:link rel="alternate" hreflang="x-default" href="${url(marketingPath("fr"))}" />`,
  ].join("\n");
  const entries = MARKETING_LOCALES.map(
    (l) => `<url>\n<loc>${url(marketingPath(l))}</loc>\n${links}\n<changefreq>weekly</changefreq>\n<priority>${l === "fr" ? 1 : 0.8}</priority>\n</url>`,
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml", "cache-control": "public, max-age=3600" } });
}
