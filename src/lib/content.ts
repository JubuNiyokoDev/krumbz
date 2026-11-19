import fr from "../../content/site.fr.json";
import en from "../../content/site.en.json";
import rn from "../../content/site.rn.json";

/**
 * Single source of truth for every text on the site.
 * French is the reference: other locales are deep-merged over it, so any
 * missing translation falls back to French instead of breaking the page.
 */
export type SiteContent = typeof fr;
export type SceneContent = SiteContent["home"]["moments"]["scenes"][number];
export type ProductContent = SiteContent["products"]["items"][number] & {
  price: number | null;
  compareAtPrice: number | null;
};

const sources: Record<string, unknown> = { fr, en, rn };

export const TO_COMPLETE = "À COMPLÉTER";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    // Arrays and scalars: the override wins only when it is defined and of the same kind.
    if (override === undefined || override === null) return base;
    if (Array.isArray(base) !== Array.isArray(override)) return base;
    return override as T;
  }
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    result[key] = key in base ? deepMerge((base as Record<string, unknown>)[key], value) : value;
  }
  return result as T;
}

const cache = new Map<string, SiteContent>();

export function loadContent(locale: string): SiteContent {
  const hit = cache.get(locale);
  if (hit) return hit;
  const merged = locale === "fr" ? fr : deepMerge(fr, sources[locale]);
  cache.set(locale, merged);
  return merged;
}

/** True when a value still needs to be provided by the brand. */
export function isToComplete(value: unknown): boolean {
  return typeof value === "string" && value.includes(TO_COMPLETE);
}
