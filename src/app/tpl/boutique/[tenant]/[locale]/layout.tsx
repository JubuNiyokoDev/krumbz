import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { LOCALE_LABELS } from "@/i18n/config";
import { siteUrl } from "@/lib/seo/site";
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
  // Shops other than Krumbz: their own icon (else logo); Krumbz keeps the app/icon.png files.
  const icon = data && !isBespoke(data.tenant) ? [data.tenant.theme.iconUrl, data.tenant.theme.logoUrl].find((u) => mediaExists(u)) : null;
  return {
    metadataBase: siteUrl(),
    title: { default: t("defaultTitle"), template: t("titleTemplate") },
    description: t("defaultDescription"),
    applicationName: data?.tenant.name ?? "Krumbz",
    formatDetection: { telephone: false },
    ...(icon ? { icons: { icon, apple: icon } } : {}),
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
