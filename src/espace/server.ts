import "server-only";
import { headers } from "next/headers";
import { requireVendor, type VendorSession } from "@/lib/auth/guards";
import type { EspaceDeps, EspaceEffects } from "@/lib/espace/context";
import { isLocalHost, normalizeHost, tenantOrigin } from "@/lib/tenant/hosts";
import { requestHostHeader } from "@/lib/tenant/request-host";
import { revalidateTenant } from "@/lib/tenant/storefront";
import { removeStoredImage, storeImage } from "@/lib/uploads/images";
import { espaceLocale, espaceMessages, type EspaceLocale, type EspaceMessages } from "./i18n";

export const effects: EspaceEffects = {
  revalidate: revalidateTenant,
  storeImage: (owner, file) => storeImage(owner, file),
  removeImage: removeStoredImage,
};

export interface VendorContext {
  locale: EspaceLocale;
  m: EspaceMessages;
  session: VendorSession;
  deps: EspaceDeps;
}

/** Authenticated vendor (redirects to /connexion otherwise) + what the operations need. */
export async function vendorContext(rawLocale: string, options: { allowMustChange?: boolean } = {}): Promise<VendorContext> {
  const locale = espaceLocale(rawLocale);
  const session = await requireVendor(locale, options);
  return {
    locale,
    m: espaceMessages(locale),
    session,
    deps: { actor: { userId: session.userId, tenantId: session.tenantId }, effects },
  };
}

/** Public storefront URL: https://<slug>.<root>, or http://<slug>.localhost:<port> in local development. */
export async function storefrontUrl(slug: string): Promise<string> {
  const raw = requestHostHeader(await headers()) ?? "";
  const host = normalizeHost(raw);
  if (isLocalHost(host)) {
    const port = raw.match(/:(\d+)$/)?.[1];
    return `http://${slug}.localhost${port ? `:${port}` : ""}`;
  }
  return tenantOrigin(slug, { staging: host.startsWith("staging-") });
}
