import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { LOCALE_LABELS } from "@/i18n/config";
import { siteUrl } from "@/lib/seo/site";
import { resolveTextures } from "@/lib/assets/server";
import { fredoka, nunito } from "../fonts";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SiteShell } from "@/components/layout/SiteShell";
import { ExperienceLayer } from "@/components/three/ExperienceLayer";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as (typeof routing.locales)[number], namespace: "seo" });
  return {
    metadataBase: siteUrl(),
    title: { default: t("defaultTitle"), template: t("titleTemplate") },
    description: t("defaultDescription"),
    applicationName: "Krumbz",
    formatDetection: { telephone: false },
    icons: { icon: "/favicon.ico" },
  };
}

export const viewport: Viewport = {
  themeColor: "#fff6e8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

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
