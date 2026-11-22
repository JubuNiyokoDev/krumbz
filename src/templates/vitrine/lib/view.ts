import type { PlatformLocale, Product, StorefrontData, Tenant } from "@/lib/tenant/types";
import { readContent, type VitrineContent } from "./content";
import { tx, uiStrings, type UiStrings } from "./i18n";
import { createLinkBuilder, type ResolvedLinks, type VitrineLinkBuilder, type VitrinePage } from "./links";
import type { CatalogItem } from "./cart";

/** Everything the server sections need, resolved once per request. */
export interface View {
  tenant: Tenant;
  products: Product[];
  featured: Product | null;
  locale: PlatformLocale;
  ui: UiStrings;
  content: VitrineContent;
  links: ResolvedLinks;
  linkFor: VitrineLinkBuilder;
  catalog: CatalogItem[];
}

export interface ViewOptions {
  basePath?: string;
  page: VitrinePage;
  productSlug?: string;
}

/** Visible products in display order (the caller should already filter, this is a safety net). */
export function visibleProducts(products: Product[]): Product[] {
  return products.filter((p) => p.visible).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function buildView(data: StorefrontData, { basePath = "", page, productSlug }: ViewOptions): View {
  const { tenant } = data;
  // A locale the shop does not offer falls back to its default one.
  const locale = tenant.locales.includes(data.locale) ? data.locale : (tenant.locales[0] ?? "fr");
  const linkFor = createLinkBuilder(basePath);
  const products = visibleProducts(data.products);
  const featured = products.find((p) => p.featured && p.modelUrl) ?? products.find((p) => p.featured) ?? products[0] ?? null;
  const locales = tenant.features.languages ? tenant.locales : tenant.locales.slice(0, 1);
  const productHref = (slug: string) => linkFor({ page: "product", productSlug: slug, locale });
  const links: ResolvedLinks = {
    home: linkFor({ page: "home", locale }),
    products: linkFor({ page: "products", locale }),
    order: linkFor({ page: "order", locale }),
    contact: linkFor({ page: "contact", locale }),
    product: Object.fromEntries(products.map((p) => [p.slug, productHref(p.slug)])),
    locales: locales.map((l) => ({ locale: l, href: linkFor({ page, productSlug, locale: l }) })),
  };
  const catalog: CatalogItem[] = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: tx(p.name, locale),
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    image: p.images[0] ? { url: p.images[0].url, alt: tx(p.images[0].alt, locale) } : null,
    href: productHref(p.slug),
  }));
  return { tenant, products, featured, locale, ui: uiStrings(locale), content: readContent(tenant.content), links, linkFor, catalog };
}
