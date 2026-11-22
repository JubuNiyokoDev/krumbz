/**
 * Generic immersive storefront template « vitrine » (Rundinova Studio).
 *
 * Pure component tree: everything comes from `StorefrontData` (no fetching,
 * no database). Colours / fonts / radius come from `tenant.theme`, texts from
 * `tenant.content` (keys documented in ./lib/content.ts), `tenant.scenes` and
 * the products, chrome strings from ./lib/i18n.ts (fr, rn, en, sw).
 *
 *   <VitrineStorefront data={data} page="product" productSlug="runner" basePath="" />
 *
 * Unknown product slug: call `findVitrineProduct()` first and `notFound()` in
 * the route, or let the component render its own clean "not found" block.
 */
import type { ReactNode } from "react";
import type { Metadata } from "next";
import type { Product, StorefrontData } from "@/lib/tenant/types";
import { VitrineProvider, type VitrineClientData } from "./lib/context";
import { LOCALE_NAMES, tx } from "./lib/i18n";
import type { VitrinePage } from "./lib/links";
import { googleFontsHref, themeStyle } from "./lib/theme";
import { buildView, visibleProducts, type View } from "./lib/view";
import { CartDrawer } from "./components/CartDrawer";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Shell } from "./components/Shell";
import { ContactPage } from "./pages/Contact";
import { HomePage } from "./pages/Home";
import { OrderPage } from "./pages/Order";
import { ProductNotFound, ProductPage } from "./pages/Product";
import { ProductsPage } from "./pages/Products";
import "./vitrine.css";

export type { VitrinePage } from "./lib/links";
export { createLinkBuilder, parseVitrinePath, vitrineHref, VITRINE_PATHNAMES, type ParsedVitrinePath } from "./lib/links";
export { readContent, type VitrineContent } from "./lib/content";

export interface VitrineStorefrontProps {
  data: StorefrontData;
  page: VitrinePage;
  productSlug?: string;
  /** Mount point of the storefront ("" on a vendor host, "/demo-vitrine" for the preview). */
  basePath?: string;
}

/** Visible product by slug, or null (→ the route should answer 404). */
export function findVitrineProduct(data: StorefrontData, slug: string | undefined): Product | null {
  if (!slug) return null;
  return visibleProducts(data.products).find((p) => p.slug === slug) ?? null;
}

/**
 * Template chrome (theme variables, tenant fonts, header, cart drawer, footer,
 * page transitions, smooth scroll). Usable as a layout wrapper; the
 * storefront renders it itself.
 */
export function VitrineShell({ data, page, productSlug, basePath = "", children }: VitrineStorefrontProps & { children: ReactNode }) {
  return <ShellFrame view={buildView(data, { basePath, page, productSlug })} page={page}>{children}</ShellFrame>;
}

function ShellFrame({ view, page, children }: { view: View; page: VitrinePage; children: ReactNode }) {
  const { tenant, locale, ui, links, catalog } = view;
  const client: VitrineClientData = {
    tenantSlug: tenant.slug,
    shopName: tenant.name,
    whatsapp: tenant.contact.whatsapp,
    locale,
    features: tenant.features,
    ui,
    links,
    catalog,
  };
  return (
    <div className="vt" style={themeStyle(tenant.theme)} lang={LOCALE_NAMES[locale].htmlLang} data-motion="full" data-page={page}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={googleFontsHref(tenant.theme)} precedence="default" />
      <VitrineProvider value={client}>
        <Shell>
          <a href="#vt-main" className="vt-skip">
            {ui.skip}
          </a>
          <div aria-hidden className="vt-ambient" />
          <Header page={page} logoUrl={tenant.theme.logoUrl} showLanguages={tenant.features.languages} />
          <main id="vt-main" tabIndex={-1} className="relative outline-none">
            {children}
          </main>
          <Footer view={view} />
          <CartDrawer />
        </Shell>
      </VitrineProvider>
    </div>
  );
}

export function VitrineStorefront({ data, page, productSlug, basePath = "" }: VitrineStorefrontProps) {
  const view = buildView(data, { basePath, page, productSlug });
  let body: ReactNode;
  switch (page) {
    case "products":
      body = <ProductsPage view={view} />;
      break;
    case "product": {
      const product = view.products.find((p) => p.slug === productSlug);
      body = product ? <ProductPage view={view} product={product} /> : <ProductNotFound view={view} />;
      break;
    }
    case "order":
      body = <OrderPage view={view} />;
      break;
    case "contact":
      body = <ContactPage view={view} />;
      break;
    default:
      body = <HomePage view={view} />;
  }
  return (
    <ShellFrame view={view} page={page}>
      {body}
    </ShellFrame>
  );
}

/** <title>, description, alternates and Open Graph for one storefront page. */
export function vitrineMetadata({ data, page, productSlug, basePath = "" }: VitrineStorefrontProps): Metadata {
  const view = buildView(data, { basePath, page, productSlug });
  const { tenant, content, locale, ui, links } = view;
  const tagline = tx(content.tagline, locale);
  const homeTitle = tx(content.seo.title, locale) || (tagline ? `${tenant.name} — ${tagline}` : tenant.name);
  const homeDescription = tx(content.seo.description, locale) || tx(content.hero.text, locale) || tagline;
  const product = page === "product" ? findVitrineProduct(data, productSlug) : null;
  const titles: Record<VitrinePage, string> = {
    home: homeTitle,
    products: `${ui.products} — ${tenant.name}`,
    product: product ? `${tx(product.name, locale)} — ${tenant.name}` : `${ui.notFoundTitle} — ${tenant.name}`,
    order: `${ui.order} — ${tenant.name}`,
    contact: `${ui.contact} — ${tenant.name}`,
  };
  const description = product ? tx(product.short, locale) : homeDescription;
  const image = product?.images[0]?.url ?? view.featured?.images[0]?.url;
  return {
    title: { absolute: titles[page] },
    description: description || undefined,
    alternates: {
      languages: Object.fromEntries(links.locales.map((l) => [LOCALE_NAMES[l.locale].htmlLang, l.href])),
    },
    openGraph: {
      title: titles[page],
      description: description || undefined,
      siteName: tenant.name,
      type: "website",
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}
