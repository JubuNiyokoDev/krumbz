import type { Metadata, Viewport } from "next";
import { PausedStorefront } from "@/app/paused/PausedStorefront";
import { StatsBeacon } from "@/components/stats/StatsBeacon";
import { tenantOrigin } from "@/lib/tenant/hosts";
import { listStorefrontParams } from "@/lib/tenant/storefront";
import type { Localized, PlatformLocale } from "@/lib/tenant/types";
import { vitrineData } from "../../data";

/**
 * Generic immersive template « vitrine » (src/templates/vitrine): <slug>.rundinova.com/<path> →
 * /tpl/vitrine/<slug>/<locale>/<path> (src/proxy.ts, src/i18n/vitrine-routing.ts).
 * Shops known at build time are prerendered, the others on first visit; data cached per tenant.
 */
export function generateStaticParams() {
  return listStorefrontParams("vitrine");
}

const text = (value: unknown, locale: PlatformLocale): string | undefined => {
  if (!value || typeof value !== "object") return typeof value === "string" ? value : undefined;
  const l = value as Localized;
  return l[locale] || l.fr || undefined;
};

export async function generateMetadata({ params }: LayoutProps<"/tpl/vitrine/[tenant]/[locale]">): Promise<Metadata> {
  const data = await vitrineData(params);
  const { tenant, locale } = data;
  const hero = (tenant.content.hero ?? {}) as Record<string, unknown>;
  const description = text(hero.subtitle, locale) ?? text(tenant.content.description, locale);
  const og = tenant.scenes[0]?.imageUrl ?? data.products.find((p) => p.images[0])?.images[0]?.url;
  return {
    metadataBase: new URL(tenantOrigin(tenant.slug)),
    title: { default: tenant.name, template: `%s · ${tenant.name}` },
    description,
    applicationName: tenant.name,
    formatDetection: { telephone: false },
    openGraph: { siteName: tenant.name, type: "website", locale, images: og ? [{ url: og }] : undefined },
    icons: tenant.theme.logoUrl ? { icon: tenant.theme.logoUrl } : undefined,
  };
}

export async function generateViewport({ params }: LayoutProps<"/tpl/vitrine/[tenant]/[locale]">): Promise<Viewport> {
  const { tenant } = await vitrineData(params);
  return { themeColor: tenant.theme.colors.background, width: "device-width", initialScale: 1, viewportFit: "cover" };
}

export default async function VitrineLayout({ children, params }: LayoutProps<"/tpl/vitrine/[tenant]/[locale]">) {
  const data = await vitrineData(params);
  const { tenant, locale } = data;
  return (
    <html lang={locale}>
      <body style={{ margin: 0 }}>
        {tenant.status === "paused" ? <PausedStorefront tenant={tenant} locale={locale} /> : children}
        {tenant.features.stats && tenant.status !== "paused" ? <StatsBeacon /> : null}
      </body>
    </html>
  );
}
