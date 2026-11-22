import "server-only";
import { notFound } from "next/navigation";
import { getStorefrontData } from "@/lib/tenant/storefront";
import type { StorefrontData } from "@/lib/tenant/types";

/** Storefront data of a « vitrine » shop for one locale, or the 404 page. */
export async function vitrineData(params: Promise<{ tenant: string; locale: string }>): Promise<StorefrontData> {
  const { tenant, locale } = await params;
  const data = await getStorefrontData(tenant, locale);
  if (!data || data.tenant.template !== "vitrine") notFound();
  return data;
}
