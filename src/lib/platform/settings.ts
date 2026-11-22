/**
 * Platform settings (table `settings`), edited in the super-admin « Réglages » page.
 *
 *   key "offer"     → OfferSettings  (prices in BIF, trial length, localized texts of the offer)
 *   key "rundinova" → StudioSettings (WhatsApp of the studio, mobile-money numbers)
 *
 * getOfferSettings() / getStudioSettings() never throw: defaults are returned when the row
 * is missing, partially filled, or when there is no database (build). The marketing site
 * reads them; the super-admin calls revalidateTag(SETTINGS_TAG) after a change.
 */
import { eq } from "drizzle-orm";
import { getDb, hasDatabase, type Db } from "../db/client.ts";
import { settings } from "../db/schema.ts";
import { PLATFORM_LOCALES, type Localized } from "../tenant/types.ts";

export const OFFER_KEY = "offer";
export const STUDIO_KEY = "rundinova";
/** Cache tag of anything rendered from the settings (marketing site). */
export const SETTINGS_TAG = "platform-settings";

export interface OfferTexts {
  headline: Localized;
  launch: Localized;
  monthly: Localized;
  note: Localized;
}

export interface OfferSettings {
  currency: "BIF";
  /** Launch pack (setup + first month included). */
  launchPriceBif: number;
  monthlyPriceBif: number;
  /** Months of subscription included in the launch pack. */
  launchIncludedMonths: number;
  /** Trial length of a new shop, in days. */
  trialDays: number;
  texts: OfferTexts;
}

export interface MobileMoneyAccount {
  number: string;
  name: string;
  /** true while the owner has not provided the real value (decision D4). */
  placeholder: boolean;
}

export interface StudioSettings {
  /** Rundinova Studio WhatsApp, digits with country code. */
  whatsapp: string;
  /** true while the owner has not provided the real number (decision D4 pending). */
  whatsappPlaceholder: boolean;
  lumicash: MobileMoneyAccount;
  ecocash: MobileMoneyAccount;
  /** Public Amtips payment link (QR scan or click). */
  paymentLink: string;
  /** Path to the Amtips QR image served by the app (public/...). */
  paymentQrPath: string;
}

export const DEFAULT_OFFER: OfferSettings = {
  currency: "BIF",
  launchPriceBif: 50_000,
  monthlyPriceBif: 10_000,
  launchIncludedMonths: 1,
  trialDays: 14,
  texts: {
    headline: {
      fr: "Votre boutique immersive, commandes sur WhatsApp",
      en: "Your immersive shop, orders on WhatsApp",
      sw: "Duka lako la kuvutia, oda kupitia WhatsApp",
    },
    launch: {
      fr: "Pack de lancement : mise en ligne + 1er mois inclus",
      en: "Launch pack: setup + first month included",
      sw: "Kifurushi cha uzinduzi: kuweka duka + mwezi wa kwanza",
    },
    monthly: { fr: "Puis abonnement mensuel", en: "Then a monthly subscription", sw: "Kisha usajili wa kila mwezi" },
    note: {
      fr: "Paiement via le lien ou QR Amtips (Lumicash, EcoCash, etc.), validé sous 24 h.",
      en: "Payment via the Amtips link or QR (Lumicash, EcoCash, etc.), confirmed within 24 h.",
      sw: "Malipo kupitia kiungo au QR ya Amtips (Lumicash, EcoCash, n.k.), yanathibitishwa ndani ya saa 24.",
    },
  },
};

/** Rundinova Studio contact/payment defaults. WhatsApp/Lumicash confirmed by owner (2026-11-22); EcoCash still pending. */
export const DEFAULT_STUDIO: StudioSettings = {
  whatsapp: "25767309309",
  whatsappPlaceholder: false,
  lumicash: { number: "25767309309", name: "Niyondiko Joffre", placeholder: false },
  ecocash: { number: "25700000000", name: "Rundinova Studio", placeholder: true },
  paymentLink: "https://amtips.app/t/1645db99-16f5-4d53-b20f-074a0ab0c207?campaign=2e1f738f-61a2-48bb-a19b-ec12cac67b99",
  paymentQrPath: "/images/payment/amtips-qr.png",
};

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const int = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : fallback;
const str = (value: unknown, fallback: string) => (typeof value === "string" && value.trim() ? value : fallback);

function localized(value: unknown, fallback: Localized): Localized {
  if (!isObject(value) || typeof value.fr !== "string" || !value.fr.trim()) return fallback;
  const out: Localized = { fr: value.fr };
  for (const locale of PLATFORM_LOCALES) {
    if (locale !== "fr" && typeof value[locale] === "string" && (value[locale] as string).trim()) out[locale] = value[locale] as string;
  }
  return out;
}

/** Stored value (possibly partial or from an older version) merged over the defaults. */
export function mergeOffer(raw: unknown): OfferSettings {
  const v = isObject(raw) ? raw : {};
  const texts = isObject(v.texts) ? v.texts : {};
  return {
    currency: "BIF",
    launchPriceBif: int(v.launchPriceBif, DEFAULT_OFFER.launchPriceBif, 0, 100_000_000),
    monthlyPriceBif: int(v.monthlyPriceBif, DEFAULT_OFFER.monthlyPriceBif, 1, 100_000_000),
    launchIncludedMonths: int(v.launchIncludedMonths, DEFAULT_OFFER.launchIncludedMonths, 0, 24),
    trialDays: int(v.trialDays, DEFAULT_OFFER.trialDays, 0, 365),
    texts: {
      headline: localized(texts.headline, DEFAULT_OFFER.texts.headline),
      launch: localized(texts.launch, DEFAULT_OFFER.texts.launch),
      monthly: localized(texts.monthly, DEFAULT_OFFER.texts.monthly),
      note: localized(texts.note, DEFAULT_OFFER.texts.note),
    },
  };
}

function account(value: unknown, fallback: MobileMoneyAccount): MobileMoneyAccount {
  const v = isObject(value) ? value : {};
  return { number: str(v.number, fallback.number), name: str(v.name, fallback.name), placeholder: typeof v.placeholder === "boolean" ? v.placeholder : fallback.placeholder };
}

export function mergeStudio(raw: unknown): StudioSettings {
  const v = isObject(raw) ? raw : {};
  return {
    whatsapp: str(v.whatsapp, DEFAULT_STUDIO.whatsapp),
    whatsappPlaceholder: typeof v.whatsappPlaceholder === "boolean" ? v.whatsappPlaceholder : DEFAULT_STUDIO.whatsappPlaceholder,
    lumicash: account(v.lumicash, DEFAULT_STUDIO.lumicash),
    ecocash: account(v.ecocash, DEFAULT_STUDIO.ecocash),
    paymentLink: str(v.paymentLink, DEFAULT_STUDIO.paymentLink),
    paymentQrPath: str(v.paymentQrPath, DEFAULT_STUDIO.paymentQrPath),
  };
}

async function readSetting(key: string, db?: Db): Promise<unknown> {
  if (!db && !hasDatabase()) return undefined;
  try {
    const [row] = await (db ?? getDb()).select({ value: settings.value }).from(settings).where(eq(settings.key, key)).limit(1);
    return row?.value;
  } catch (error) {
    console.warn(`[settings] ${key}: defaults used (${(error as Error).message})`);
    return undefined;
  }
}

export async function getOfferSettings(db?: Db): Promise<OfferSettings> {
  return mergeOffer(await readSetting(OFFER_KEY, db));
}

export async function getStudioSettings(db?: Db): Promise<StudioSettings> {
  return mergeStudio(await readSetting(STUDIO_KEY, db));
}

export async function writeSetting(db: Db, key: typeof OFFER_KEY | typeof STUDIO_KEY, value: OfferSettings | StudioSettings): Promise<void> {
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}
