import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { espaceRouting } from "@/i18n/platform";
import { espaceMessages } from "@/espace/i18n";
import "./espace.css";

/**
 * Vendor space (espace.rundinova.com → /espace/[locale]/…, see src/proxy.ts). FR + RN.
 * Mobile first, light: system fonts, one small stylesheet, no client library.
 * Every data access goes through forTenant(session.tenantId) (src/lib/espace/*).
 */
export async function generateMetadata({ params }: LayoutProps<"/espace/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const m = espaceMessages(locale);
  return {
    title: { default: `${m.meta.title} · ${m.meta.brand}`, template: `%s · ${m.meta.title}` },
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d3f6e",
};

export default async function EspaceLayout({ children, params }: LayoutProps<"/espace/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(espaceRouting.locales, locale)) notFound();
  return (
    <html lang={locale}>
      <body className="espace">{children}</body>
    </html>
  );
}
