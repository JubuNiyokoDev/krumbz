import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenant/storefront";
import { PausedStorefront } from "../../PausedStorefront";

export default async function PausedPage({ params }: PageProps<"/paused/[tenant]/[locale]">) {
  const { tenant: slug, locale } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();
  return <PausedStorefront tenant={tenant} locale={locale} />;
}
