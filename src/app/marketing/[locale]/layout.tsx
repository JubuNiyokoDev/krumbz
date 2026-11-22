import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { marketingRouting } from "@/i18n/platform";
import { rundinovaMetadata } from "@/marketing";
import { RUNDINOVA_THEME_COLOR } from "@/marketing";

/** Marketing site of Rundinova Studio: isoko.<root>/<locale> → /marketing/<locale> (src/proxy.ts). */
export function generateStaticParams() {
  return marketingRouting.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/marketing/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(marketingRouting.locales, locale)) notFound();
  return rundinovaMetadata(locale);
}

export function generateViewport(): Viewport {
  return { themeColor: RUNDINOVA_THEME_COLOR, width: "device-width", initialScale: 1, viewportFit: "cover" };
}

export default async function MarketingLayout({ children, params }: LayoutProps<"/marketing/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(marketingRouting.locales, locale)) notFound();
  return (
    <html lang={locale}>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
