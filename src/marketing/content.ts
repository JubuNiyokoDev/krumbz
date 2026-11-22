import fr from "../../content/rundinova/fr.json";
import rn from "../../content/rundinova/rn.json";
import en from "../../content/rundinova/en.json";
import sw from "../../content/rundinova/sw.json";
import type { MarketingLocale } from "./types";

/**
 * Every text of the Rundinova marketing site. French is the reference: other
 * locales are deep-merged over it, so a missing key falls back to French.
 */
export type MarketingContent = typeof fr;

const sources: Record<MarketingLocale, unknown> = { fr, rn, en, sw };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function merge<T>(base: T, override: unknown): T {
  if (Array.isArray(base)) {
    if (!Array.isArray(override)) return base;
    // Arrays of objects are merged item by item; scalars arrays are replaced.
    return base.map((item, i) => (i < override.length ? merge(item, override[i]) : item)) as T;
  }
  if (isObject(base)) {
    if (!isObject(override)) return base;
    const out: Record<string, unknown> = { ...base };
    for (const key of Object.keys(base)) out[key] = merge(base[key], override[key]);
    return out as T;
  }
  return typeof override === typeof base && override !== "" ? (override as T) : base;
}

const cache = new Map<MarketingLocale, MarketingContent>();

export function getMarketingContent(locale: MarketingLocale): MarketingContent {
  let content = cache.get(locale);
  if (!content) {
    content = locale === "fr" ? fr : merge(fr, sources[locale]);
    cache.set(locale, content);
  }
  return content;
}

/** Replaces `{key}` placeholders. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
