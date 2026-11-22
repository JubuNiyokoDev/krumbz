import type { PlatformLocale } from "@/lib/tenant/types";

/** Locales of the Rundinova marketing site (same set as the platform, FR first). */
export type MarketingLocale = PlatformLocale;
export const MARKETING_LOCALES: readonly MarketingLocale[] = ["fr", "rn", "en", "sw"];

/** Offer prices: data-driven (edited later by the super-admin, `settings` table). */
export interface MarketingOffer {
  launchPrice: number;
  monthlyPrice: number;
  currency: "BIF";
}

/** Launch offer (owner decision). Fallback only: the live values come from the super-admin settings. */
export const DEFAULT_MARKETING_OFFER: MarketingOffer = { launchPrice: 50_000, monthlyPrice: 10_000, currency: "BIF" };

/** A storefront shown in the gallery (first = featured). */
export interface MarketingShop {
  name: string;
  url: string;
  /** Local `/images/...` path (optimised by next/image) or absolute URL. */
  imageUrl: string;
  tagline: string;
}

export interface RundinovaHomeProps {
  locale: MarketingLocale;
  offer: MarketingOffer;
  shops: MarketingShop[];
  /** Digits only, with country code (e.g. 257XXXXXXXX). */
  whatsappNumber: string;
  /**
   * Optional: URL of this page in each locale, for the language switcher.
   * Defaults to the public scheme: "/", "/rn", "/en", "/sw".
   */
  localeHrefs?: Partial<Record<MarketingLocale, string>>;
}
