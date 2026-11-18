/**
 * Locale configuration.
 *
 * - `fr` is the default locale and is served without prefix (/produits).
 * - `en` is active and served under /en.
 * - `rn` (Kirundi) is ready: its content file exists (content/site.rn.json) and
 *   falls back to French for every missing key. To activate it once the
 *   translation is done, move "rn" from READY_LOCALES to ACTIVE_LOCALES.
 */
export const ACTIVE_LOCALES = ["fr", "en"] as const;
export const READY_LOCALES = ["rn"] as const;
export const DEFAULT_LOCALE = "fr" as const;

export type Locale = (typeof ACTIVE_LOCALES)[number];

export const LOCALE_LABELS: Record<string, { short: string; long: string; htmlLang: string; ogLocale: string }> = {
  fr: { short: "FR", long: "Français", htmlLang: "fr", ogLocale: "fr_BI" },
  en: { short: "EN", long: "English", htmlLang: "en", ogLocale: "en_US" },
  rn: { short: "RN", long: "Ikirundi", htmlLang: "rn", ogLocale: "rn_BI" },
};
