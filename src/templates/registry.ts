/**
 * Storefront templates: how each template turns StorefrontData into the
 * next-intl messages of its pages. Route trees: src/app/tpl/<template>/[tenant]/[locale]/.
 */
import "server-only";
import { notFound } from "next/navigation";
import { getStorefrontData } from "@/lib/tenant/storefront";
import type { StorefrontData, TemplateId } from "@/lib/tenant/types";
import { buildKrumbzContent } from "./krumbz/content";

type Messages = Record<string, unknown>;

const MESSAGES: Record<TemplateId, (data: StorefrontData) => Messages> = {
  krumbz: buildKrumbzContent,
  // Generic template (src/templates/vitrine): plug its message builder here.
  vitrine: (data) => ({ tenant: { name: data.tenant.name } }),
};

/** Messages of a storefront request; 404 when the tenant or the locale does not exist. */
export async function getStorefrontMessages(slug: string, locale: string): Promise<Messages> {
  const data = await getStorefrontData(slug, locale);
  if (!data) notFound();
  return MESSAGES[data.tenant.template](data);
}
