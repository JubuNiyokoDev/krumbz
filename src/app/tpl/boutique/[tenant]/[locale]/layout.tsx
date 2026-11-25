import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { LOCALE_LABELS } from "@/i18n/config";
import { siteUrl } from "@/lib/seo/site";
import { publicOrigin } from "@/lib/tenant/hosts";
import { resolveTextures } from "@/lib/assets/server";
import { shopFonts } from "@/app/fonts";
import { paletteStyle, resolvePalette } from "@/lib/storefront/theme";
import { storefrontKit, storefrontMedia } from "@/lib/storefront/media";
import { KitProvider } from "@/lib/storefront/kit";
import { buildStorefrontContent, isBespoke, mediaExists } from "@/templates/boutique/content";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SiteShell } from "@/components/layout/SiteShell";
import { ExperienceLayer } from "@/components/three/ExperienceLayer";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";
import { getStorefrontData, listStorefrontParams } from "@/lib/tenant/storefront";
import { PausedStorefront } from "@/app/paused/PausedStorefront";
import { StatsBeacon } from "@/components/stats/StatsBeacon";
import "@/app/globals.css";
import "./storefront.css";

/**
 * The single storefront template (the Krumbz experience; only the shop data changes), via src/proxy.ts: <slug>.rundinova.com/<path> →
 * /tpl/boutique/<slug>/<locale>/<path>. Shops known at build time are prerendered,
 * the others on first visit (ISR); data is cached per tenant (src/lib/tenant/storefront.ts).
 */
export function generateStaticParams() {
  return listStorefrontParams();
}

export async function generateMetadata({ params }: LayoutProps<"/tpl/boutique/[tenant]/[locale]">): Promise<Metadata> {
  const { tenant, locale } = await params;
  const t = await getTranslations({ locale: locale as (typeof routing.locales)[number], namespace: "seo" });
  const data = await getStorefrontData(tenant, locale);
  // Krumbz: its biscuit icons (public/favicon.ico + app/icon.png, app/apple-icon.png). Other shops: icons generated
  // from their favicon (else logo), src/lib/uploads/brand.ts; without any image, a monogram in their colours.
  const shop = data && !isBespoke(data.tenant) ? data.tenant : null;
  const brand = shop?.theme.brand && mediaExists(shop.theme.brand.icon32) ? shop.theme.brand : null;
  const legacyIcon = shop && !brand ? [shop.theme.iconUrl, shop.theme.logoUrl].find((u) => mediaExists(u)) : null;
  let icons: Metadata["icons"];
  if (!shop) {
    icons = {
      icon: [
        { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
        { url: "/icon.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    };
  } else if (brand) {
    icons = {
      icon: [
        { url: brand.icon32, sizes: "32x32", type: "image/png" },
        { url: brand.icon192, sizes: "192x192", type: "image/png" },
      ],
      apple: [{ url: brand.icon180, sizes: "180x180", type: "image/png" }],
    };
  } else if (legacyIcon) {
    icons = { icon: legacyIcon, apple: legacyIcon };
  } else {
    const p = resolvePalette(shop.theme);
    const initial = (Array.from(shop.name.trim())[0] ?? "").toUpperCase().replace(/[<>&"']/g, "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${p.gold}"/><text x="32" y="44" text-anchor="middle" font-family="sans-serif" font-size="36" font-weight="700" fill="${p.navy}">${initial}</text></svg>`;
    icons = { icon: [{ url: `data:image/svg+xml,${encodeURIComponent(svg)}`, type: "image/svg+xml" }] };
  }
  return {
    // Every shop (Krumbz included): its own public origin (https://<slug>.rundinova.com); NEXT_PUBLIC_SITE_URL is only a fallback.
    metadataBase: data ? new URL(publicOrigin(data.tenant.slug)) : siteUrl(),
    title: { default: t("defaultTitle"), template: t("titleTemplate") },
    description: t("defaultDescription"),
    applicationName: data?.tenant.name ?? "Krumbz",
    formatDetection: { telephone: false },
    icons,
    ...(shop ? { manifest: `/api/manifest/${shop.slug}` } : {}),
  };
}

export async function generateViewport({ params }: LayoutProps<"/tpl/boutique/[tenant]/[locale]">): Promise<Viewport> {
  const { tenant, locale } = await params;
  const data = await getStorefrontData(tenant, locale);
  return {
    themeColor: data ? resolvePalette(data.tenant.theme).cream : "#fff6e8",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/tpl/boutique/[tenant]/[locale]">) {
  const { tenant, locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const data = await getStorefrontData(tenant, locale);
  if (!data) notFound();
  // The proxy already routes paused shops to /paused; this covers its short route cache.
  if (data.tenant.status === "paused") {
    return (
      <html lang={LOCALE_LABELS[locale].htmlLang}>
        <body>
          <PausedStorefront tenant={data.tenant} locale={locale} />
        </body>
      </html>
    );
  }

  const messages = await getMessages();
  const t = await getTranslations("nav");
  const textures = resolveTextures();
  const content = buildStorefrontContent(data);
  const kit = storefrontKit(data, content, storefrontMedia(data));
  const fonts = shopFonts(data.tenant.theme.fonts.display, data.tenant.theme.fonts.body);
  // Krumbz: no inline variables (its tokens are the @theme defaults) — pixel-identical.
  const style = isBespoke(data.tenant) ? undefined : ({ ...paletteStyle(resolvePalette(data.tenant.theme)), ...fonts.style } as CSSProperties);

  return (
    <html lang={LOCALE_LABELS[locale].htmlLang} className={fonts.className} style={style}>
      <body className="min-h-dvh bg-cream font-sans text-navy antialiased">
        <KitProvider kit={kit}>
        <NextIntlClientProvider messages={messages}>
          <a
            href="#contenu"
            className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-navy px-5 py-3 font-semibold text-cream transition-transform focus:translate-y-0"
          >
            {t("skipToContent")}
          </a>
          <SiteShell>
            <Header />
            <ExperienceLayer textures={textures} />
            <main id="contenu" tabIndex={-1} className="relative outline-none">
              {children}
            </main>
            <Footer />
          </SiteShell>
          <OrganizationJsonLd locale={locale} />
          {data.tenant.features.stats ? <StatsBeacon /> : null}
        </NextIntlClientProvider>
        </KitProvider>
      </body>
    </html>
  );
}
