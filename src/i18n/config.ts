/**
 * Locale configuration.
 *
 * - `fr` is the default locale and is served without prefix (/produits).
 * - `en`, `rn` (Kirundi) and `sw` (Swahili) are active, each served under its
 *   own prefix (/en, /rn, /sw). Every key in content/site.{en,rn,sw}.json
 *   falls back to the French text (content/site.fr.json) when missing.
 * - Kirundi (`rn`) was translated with AI assistance: a native speaker should
 *   review it (see content/site.rn.json → _meta.important).
 */
export const ACTIVE_LOCALES = ["fr", "en", "rn", "sw"] as const;
export const READY_LOCALES = [] as const;
export const DEFAULT_LOCALE = "fr" as const;
export type Locale = (typeof ACTIVE_LOCALES)[number];

export const LOCALE_LABELS: Record<string, { short: string; long: string; htmlLang: string; ogLocale: string }> = {
  fr: { short: "FR", long: "Français", htmlLang: "fr", ogLocale: "fr_BI" },
  en: { short: "EN", long: "English", htmlLang: "en", ogLocale: "en_US" },
  rn: { short: "RN", long: "Ikirundi", htmlLang: "rn", ogLocale: "rn_BI" },
  sw: { short: "SW", long: "Kiswahili", htmlLang: "sw", ogLocale: "sw_KE" },
};
