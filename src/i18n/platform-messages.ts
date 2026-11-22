/**
 * Messages of the platform areas (marketing, vendor space, super-admin), one
 * namespace per area. Each area registers its loader here; its layout passes
 * only its own namespace to <NextIntlClientProvider>.
 *
 *   const LOADERS = { marketing: (locale) => import(`@/marketing/messages/${locale}.json`).then((m) => m.default), … }
 *
 * Server code uses getTranslations("marketing.hero"), client code useTranslations("marketing.hero").
 */
type Messages = Record<string, unknown>;
type Loader = (locale: string) => Promise<Messages> | Messages;

const LOADERS: Record<"marketing" | "espace" | "admin", Loader> = {
  marketing: () => ({}),
  // Vendor space: French + Kirundi only (other locales fall back to French).
  espace: (locale) => import(`@/espace/messages/${locale === "rn" ? "rn" : "fr"}.json`).then((m) => m.default),
  admin: () => ({}),
};

export async function loadPlatformMessages(locale: string): Promise<Messages> {
  const entries = await Promise.all(Object.entries(LOADERS).map(async ([area, load]) => [area, await load(locale)] as const));
  return Object.fromEntries(entries);
}
