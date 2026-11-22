import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { espaceRouting } from "@/i18n/platform";

/**
 * Vendor space (espace.rundinova.com → /espace/[locale]/…, see src/proxy.ts). FR + RN.
 * Reserved for the vendor-space work: placeholder root layout. Every data access
 * must go through forTenant(session.tenantId) (src/lib/tenant/scoped.ts).
 */
export default async function EspaceLayout({ children, params }: LayoutProps<"/espace/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(espaceRouting.locales, locale)) notFound();
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
