import * as rootParams from "next/root-params";
import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { PLATFORM_LOCALES } from "@/lib/tenant/types";
import { getStorefrontMessages } from "@/templates/registry";
import { loadPlatformMessages } from "./platform-messages";

/**
 * Messages per request, from the root params of the route:
 * - storefronts (/tpl/<template>/[tenant]/[locale], /paused/[tenant]/[locale]):
 *   the tenant's template messages (Krumbz: content/site.*.json + products/contacts from the DB);
 * - platform areas (/marketing/[locale], /espace/[locale], /admin): platform messages
 *   (admin has no locale segment → French).
 * Root params only (no headers()): storefront pages stay static.
 */
export default getRequestConfig(async ({ locale }) => {
  const [paramLocale, tenant] = await Promise.all([rootParams.locale(), rootParams.tenant()]);
  if (!locale) {
    if (paramLocale === undefined && tenant === undefined) locale = "fr";
    else if (hasLocale(PLATFORM_LOCALES, paramLocale)) locale = paramLocale;
    else notFound();
  }

  return {
    locale,
    messages: tenant ? await getStorefrontMessages(tenant, locale) : await loadPlatformMessages(locale),
    timeZone: "Africa/Bujumbura",
    // A missing key must never crash the page: show the key path instead.
    onError() {},
    getMessageFallback({ namespace, key }) {
      return [namespace, key].filter(Boolean).join(".");
    },
  };
});
