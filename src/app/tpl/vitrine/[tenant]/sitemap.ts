import type { MetadataRoute } from "next";
import { getStorefrontData, getTenantBySlug } from "@/lib/tenant/storefront";
import { headers } from "next/headers";
import { normalizeHost, resolveHost, tenantOrigin } from "@/lib/tenant/hosts";
import { requestHostHeader } from "@/lib/tenant/request-host";
import type { PlatformLocale } from "@/lib/tenant/types";

/** /sitemap.xml of a « vitrine » shop: every page and product, in every locale of the shop. */
const SEGMENTS: Record<PlatformLocale, { products: string; order: string; contact: string }> = {
  fr: { products: "produits", order: "commander", contact: "contact" },
  en: { products: "products", order: "order", contact: "contact" },
  rn: { products: "ibicuruzwa", order: "gutumiza", contact: "itumanaho" },
  sw: { products: "bidhaa", order: "agiza", contact: "mawasiliano" },
};

async function slugOf(props?: { params?: Promise<{ tenant?: string }> }): Promise<string | null> {
  const fromParams = (await props?.params)?.tenant;
  if (fromParams) return fromParams;
  const target = resolveHost(normalizeHost(requestHostHeader(await headers())));
  return target.kind === "tenant" ? target.slug : null;
}

export default async function sitemap(props?: { params?: Promise<{ tenant?: string }> }): Promise<MetadataRoute.Sitemap> {
  const slug = await slugOf(props);
  if (!slug) return [];
  const tenant = await getTenantBySlug(slug);
  if (!tenant || tenant.template !== "vitrine" || tenant.status === "paused") return [];
  const origin = tenantOrigin(slug);
  const prefix = (l: PlatformLocale) => (l === "fr" ? "" : `/${l}`);
  const data = await getStorefrontData(slug, tenant.locales[0]);
  const entries: MetadataRoute.Sitemap = [];
  for (const l of tenant.locales) {
    const s = SEGMENTS[l];
    entries.push({ url: `${origin}${prefix(l) || "/"}`, priority: 1 });
    entries.push({ url: `${origin}${prefix(l)}/${s.products}`, priority: 0.9 });
    for (const p of data?.products ?? []) entries.push({ url: `${origin}${prefix(l)}/${s.products}/${p.slug}`, priority: 0.8 });
    entries.push({ url: `${origin}${prefix(l)}/${s.order}`, priority: 0.6 });
    entries.push({ url: `${origin}${prefix(l)}/${s.contact}`, priority: 0.5 });
  }
  return entries;
}
