/**
 * The single storefront template (route tree src/app/tpl/boutique/[tenant]/[locale]/): every shop gets
 * the Krumbz experience; its next-intl messages are the shop's content (src/templates/boutique/content.ts).
 */
import "server-only";
import { notFound } from "next/navigation";
import { getStorefrontData } from "@/lib/tenant/storefront";
import { buildStorefrontContent } from "./boutique/content";

/** Messages of a storefront request; 404 when the tenant or the locale does not exist. */
export async function getStorefrontMessages(slug: string, locale: string): Promise<Record<string, unknown>> {
  const data = await getStorefrontData(slug, locale);
  if (!data) notFound();
  return buildStorefrontContent(data) as unknown as Record<string, unknown>;
}
