import { notFound } from "next/navigation";
import { getStorefrontData, listStorefrontParams } from "@/lib/tenant/storefront";

/**
 * Generic immersive template « vitrine » (src/templates/vitrine/**):
 * <slug>.rundinova.com/<path> → /tpl/vitrine/<slug>/<locale>/<path> (src/proxy.ts).
 * Placeholder root layout, to be replaced by the template work.
 */
export function generateStaticParams() {
  return listStorefrontParams("vitrine");
}

export default async function VitrineLayout({ children, params }: LayoutProps<"/tpl/vitrine/[tenant]/[locale]">) {
  const { tenant, locale } = await params;
  const data = await getStorefrontData(tenant, locale);
  if (!data || data.tenant.template !== "vitrine") notFound();
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
