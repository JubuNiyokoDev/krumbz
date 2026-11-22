import type { Localized, PlatformLocale } from "@/lib/tenant/types";
import { isLocalized, tx } from "./i18n";

/**
 * Shape of `tenant.content` read by the "vitrine" template. Every key is
 * optional: missing texts fall back to neutral defaults (or the section hides).
 * All texts are `Localized` (fr required, other locales optional).
 *
 * {
 *   tagline,                                   // one-liner under the shop name
 *   hero: { eyebrow, title, subtitle, cta, ctaSecondary },
 *   scenesIntro: { eyebrow, title, text },     // "life moments" storytelling (tenant.scenes)
 *   featured: { eyebrow, title, text, chapters: [{ title, text }] }, // featured product journey
 *   collection: { eyebrow, title, text },      // depth carousel + grid
 *   promises: [{ title, text }],               // short reassurance strip (delivery, quality…)
 *   marquee: [Localized],                      // words scrolling in the band under the hero
 *   productsIntro: { eyebrow, title, text },   // products page
 *   orderIntro: { eyebrow, title, text },
 *   contactIntro: { eyebrow, title, text },
 *   footerNote,
 *   credits: [Localized],                      // licences (3D models, photos), shown in the footer
 *   seo: { title, description }                // <title> / meta description of the home page
 * }
 */
export interface Block {
  eyebrow: Localized | null;
  title: Localized | null;
  text: Localized | null;
}

export interface VitrineContent {
  tagline: Localized | null;
  hero: Block & { cta: Localized | null; ctaSecondary: Localized | null };
  scenesIntro: Block;
  featured: Block & { chapters: { title: Localized; text: Localized }[] };
  collection: Block;
  promises: { title: Localized; text: Localized }[];
  marquee: Localized[];
  productsIntro: Block;
  orderIntro: Block;
  contactIntro: Block;
  footerNote: Localized | null;
  credits: Localized[];
  seo: { title: Localized | null; description: Localized | null };
}

type Raw = Record<string, unknown>;

const obj = (value: unknown): Raw => (typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Raw) : {});
const loc = (value: unknown): Localized | null => (isLocalized(value) ? value : null);
const pairs = (value: unknown) =>
  (Array.isArray(value) ? value : [])
    .map(obj)
    .filter((v) => isLocalized(v.title) && isLocalized(v.text))
    .map((v) => ({ title: v.title as Localized, text: v.text as Localized }));

function block(value: unknown): Block {
  const raw = obj(value);
  return { eyebrow: loc(raw.eyebrow), title: loc(raw.title), text: loc(raw.text ?? raw.subtitle) };
}

export function readContent(content: Record<string, unknown>): VitrineContent {
  const hero = obj(content.hero);
  const featured = obj(content.featured);
  const seo = obj(content.seo);
  const list = (value: unknown) => (Array.isArray(value) ? value : []).filter(isLocalized);
  return {
    tagline: loc(content.tagline),
    hero: { ...block(hero), cta: loc(hero.cta), ctaSecondary: loc(hero.ctaSecondary) },
    scenesIntro: block(content.scenesIntro),
    featured: { ...block(featured), chapters: pairs(featured.chapters) },
    collection: block(content.collection),
    promises: pairs(content.promises),
    marquee: list(content.marquee),
    productsIntro: block(content.productsIntro),
    orderIntro: block(content.orderIntro),
    contactIntro: block(content.contactIntro),
    footerNote: loc(content.footerNote),
    credits: list(content.credits),
    seo: { title: loc(seo.title), description: loc(seo.description) },
  };
}

/** Resolves a block for one locale (empty strings when missing). */
export function resolveBlock(b: Block, locale: PlatformLocale) {
  return { eyebrow: tx(b.eyebrow, locale), title: tx(b.title, locale), text: tx(b.text, locale) };
}
