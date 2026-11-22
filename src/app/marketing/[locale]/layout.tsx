import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { marketingRouting } from "@/i18n/platform";

/**
 * Marketing site of Rundinova Studio (isoko.rundinova.com → /marketing/[locale]/…, see src/proxy.ts).
 * Reserved for the marketing work (src/marketing/**): placeholder root layout.
 */
export function generateStaticParams() {
  return marketingRouting.locales.map((locale) => ({ locale }));
}

export default async function MarketingLayout({ children, params }: LayoutProps<"/marketing/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(marketingRouting.locales, locale)) notFound();
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
