import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { LOCALE_LABELS } from "@/i18n/config";
import { siteUrl } from "@/lib/seo/site";
import { resolveTextures } from "@/lib/assets/server";
import { fredoka, nunito } from "@/app/fonts";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SiteShell } from "@/components/layout/SiteShell";
import { ExperienceLayer } from "@/components/three/ExperienceLayer";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";
import { getStorefrontData, listStorefrontParams } from "@/lib/tenant/storefront";
import { PausedStorefront } from "@/app/paused/PausedStorefront";
import "@/app/globals.css";
import "./krumbz.css";

/**
 * Krumbz template, reached through src/proxy.ts: <slug>.rundinova.com/<path> →
 * /tpl/krumbz/<slug>/<locale>/<path>. Shops known at build time are prerendered,
 * the others on first visit (ISR); data is cached per tenant (src/lib/tenant/storefront.ts).
 */
export function generateStaticParams() {
  return listStorefrontParams("krumbz");
}

export async function generateMetadata({ params }: LayoutProps<"/tpl/krumbz/[tenant]/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as (typeof routing.locales)[number], namespace: "seo" });
  return {
    metadataBase: siteUrl(),
    title: { default: t("defaultTitle"), template: t("titleTemplate") },
    description: t("defaultDescription"),
    applicationName: "Krumbz",
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#fff6e8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/tpl/krumbz/[tenant]/[locale]">) {
  const { tenant, locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const data = await getStorefrontData(tenant, locale);
  if (!data || data.tenant.template !== "krumbz") notFound();
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

  return (
    <html lang={LOCALE_LABELS[locale].htmlLang} className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="min-h-dvh bg-cream font-sans text-navy antialiased">
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
