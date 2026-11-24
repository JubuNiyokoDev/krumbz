/**
 * Base texts of a shop other than Krumbz: the interface strings of content/site.<locale>.json
 * (navigation, cart, order flow, viewer, errors…) with every Krumbz-specific text removed:
 * brand sections are emptied (→ hidden until the shop provides them) and the few interface
 * sentences that named Krumbz or biscuits are replaced by the neutral ones below
 * ({brand} = shop name). The shop's own texts (tenant.content.fr / [locale]) are merged on top.
 *
 * Kirundi (rn): to be reviewed by a native speaker.
 */
import type { PlatformLocale } from "../tenant/types.ts";

type Tree = { [key: string]: Tree | string | unknown[] };

/** Paths of the Krumbz content that belong to the brand: emptied for the other shops. */
export const BRAND_PATHS: { path: string; value: "" | [] }[] = [
  ...["company", "tagline", "promise", "origin", "base", "audience"].map((k) => ({ path: `brand.${k}`, value: "" as const })),
  { path: "contact.whatsapp.note", value: "" },
  { path: "contact.country", value: "" },
  { path: "contact.socials", value: [] },
  { path: "common.madeIn", value: "" },
  ...["eyebrow", "subtitle", "packAlt"].map((k) => ({ path: `home.intro.${k}`, value: "" as const })),
  ...["eyebrow", "title", "subtitle"].map((k) => ({ path: `home.moments.${k}`, value: "" as const })),
  { path: "home.moments.scenes", value: [] },
  { path: "home.moments.breaks", value: [] },
  ...["eyebrow", "title", "nutritionNote"].map((k) => ({ path: `home.benefits.${k}`, value: "" as const })),
  { path: "home.benefits.items", value: [] },
  ...["subtitle"].map((k) => ({ path: `home.products.${k}`, value: "" as const })),
  ...["eyebrow", "title", "intro", "whyTitle", "disclaimer", "cta"].map((k) => ({ path: `home.mushroom.${k}`, value: "" as const })),
  { path: "home.mushroom.items", value: [] },
  { path: "home.mushroom.images.harvestAlt", value: "" },
  { path: "home.mushroom.images.closeupAlt", value: "" },
  ...["eyebrow", "title", "text", "alt"].map((k) => ({ path: `home.fromMushroom.${k}`, value: "" as const })),
  { path: "home.fromMushroom.steps", value: [] },
  { path: "products.intro", value: "" },
  { path: "products.ingredients.list", value: [] },
  ...["allergens", "storage", "shelfLife", "labelNote", "producer", "base", "imageAlt"].map((k) => ({
    path: `products.ingredients.${k}`,
    value: "" as const,
  })),
  { path: "products.nutrition.rows", value: [] },
  { path: "products.nutrition.disclaimer", value: "" },
  ...["eyebrow", "title", "intro"].map((k) => ({ path: `story.${k}`, value: "" as const })),
  { path: "story.chapters", value: [] },
  { path: "story.values.title", value: "" },
  { path: "story.values.items", value: [] },
  ...["eyebrow", "title", "intro"].map((k) => ({ path: `story.journey.${k}`, value: "" as const })),
  { path: "story.journey.steps", value: [] },
  { path: "legal.updated", value: "" },
  { path: "legal.sections", value: [] },
  { path: "seo.defaultDescription", value: "" },
  ...["home", "products", "story", "order", "contact", "legal"].map((k) => ({ path: `seo.pages.${k}.description`, value: "" as const })),
];

/** Neutral interface sentences ({brand} = shop name). */
const NEUTRAL: Record<PlatformLocale, Record<string, string>> = {
  fr: {
    "nav.homeLabel": "{brand}, retour à l’accueil",
    "common.loading3d": "Préparation de la vitrine…",
    "common.rights": "© {year} {brand}. Tous droits réservés.",
    "common.toCompleteHint": "Information à fournir par {brand}",
    "home.intro.title": "{brand}",
    "home.products.eyebrow": "Nos produits",
    "home.products.title": "Notre sélection",
    "home.cta.title": "Envie de commander ?",
    "products.title": "Nos produits",
    "products.viewer.biscuit": "{brand}",
    "products.promoLabel": "Promo",
    "order.title": "Votre commande {brand}",
    "order.cartEmptyCta": "Ajoutez un produit pour commencer.",
    "order.payment.cashHelp": "Modalités à confirmer avec {brand} sur WhatsApp.",
    "order.whatsapp.greeting": "Bonjour {brand} ! Je souhaite passer une commande :",
    "order.steps.products": "Choisir vos produits",
    "order.next.toProducts": "Choisir mes produits",
    "contactPage.title": "Parlons-en",
    "contactPage.intro": "Une question, une commande spéciale ? Écrivez-nous ou appelez-nous.",
    "contactPage.whatsappPrefill": "Bonjour {brand}, j’ai une question :",
    "notFound.title": "Oups, cette page s’est égarée !",
    "seo.siteName": "{brand}",
    "seo.titleTemplate": "%s · {brand}",
    "seo.defaultTitle": "{brand}",
    "seo.ogAlt": "{brand}",
    "seo.pages.home.title": "{brand}",
  },
  en: {
    "nav.homeLabel": "{brand}, back to the home page",
    "common.loading3d": "Setting up the shop window…",
    "common.rights": "© {year} {brand}. All rights reserved.",
    "common.toCompleteHint": "Information to be provided by {brand}",
    "home.intro.title": "{brand}",
    "home.products.eyebrow": "Our products",
    "home.products.title": "Our selection",
    "home.cta.title": "Ready to order?",
    "products.title": "Our products",
    "products.viewer.biscuit": "{brand}",
    "products.promoLabel": "Promo",
    "order.title": "Your {brand} order",
    "order.cartEmptyCta": "Add a product to get started.",
    "order.payment.cashHelp": "Terms to be confirmed with {brand} on WhatsApp.",
    "order.whatsapp.greeting": "Hello {brand}! I would like to place an order:",
    "order.steps.products": "Choose your products",
    "order.next.toProducts": "Choose my products",
    "contactPage.title": "Let’s talk",
    "contactPage.intro": "A question, a special order? Write to us or give us a call.",
    "contactPage.whatsappPrefill": "Hello {brand}, I have a question:",
    "notFound.title": "Oops, this page got lost!",
    "seo.siteName": "{brand}",
    "seo.titleTemplate": "%s · {brand}",
    "seo.defaultTitle": "{brand}",
    "seo.ogAlt": "{brand}",
    "seo.pages.home.title": "{brand}",
  },
  rn: {
    "nav.homeLabel": "{brand}, garuka ahabanza",
    "common.loading3d": "Turategura iduka…",
    "common.rights": "© {year} {brand}. Uburenganzira bwose burafatiwe.",
    "common.toCompleteHint": "Amakuru azotangwa na {brand}",
    "home.intro.title": "{brand}",
    "home.products.eyebrow": "Ibicuruzwa vyacu",
    "home.products.title": "Ivyo twabahitiyemwo",
    "home.cta.title": "Urashaka gutumiza?",
    "products.title": "Ibicuruzwa vyacu",
    "products.viewer.biscuit": "{brand}",
    "products.promoLabel": "Igiciro cagabanutse",
    "order.title": "Igitumizo cawe ca {brand}",
    "order.cartEmptyCta": "Ongeramwo igicuruzwa kugira utangure.",
    "order.payment.cashHelp": "Uburyo buzoshimangirwa na {brand} kuri WhatsApp.",
    "order.whatsapp.greeting": "Bwakeye {brand}! Ndashaka gutumiza :",
    "order.steps.products": "Hitamwo ibicuruzwa vyawe",
    "order.next.toProducts": "Hitamwo ibicuruzwa vyanje",
    "contactPage.title": "Tuganire",
    "contactPage.intro": "Ufise ikibazo canke igitumizo kidasanzwe? Twandikire canke uduhamagare.",
    "contactPage.whatsappPrefill": "Bwakeye {brand}, mfise ikibazo :",
    "notFound.title": "Yooo, uru rupapuro ntirubonetse!",
    "seo.siteName": "{brand}",
    "seo.titleTemplate": "%s · {brand}",
    "seo.defaultTitle": "{brand}",
    "seo.ogAlt": "{brand}",
    "seo.pages.home.title": "{brand}",
  },
  sw: {
    "nav.homeLabel": "{brand}, rudi kwenye ukurasa wa mwanzo",
    "common.loading3d": "Tunaandaa duka…",
    "common.rights": "© {year} {brand}. Haki zote zimehifadhiwa.",
    "common.toCompleteHint": "Taarifa itatolewa na {brand}",
    "home.intro.title": "{brand}",
    "home.products.eyebrow": "Bidhaa zetu",
    "home.products.title": "Uteuzi wetu",
    "home.cta.title": "Uko tayari kuagiza?",
    "products.title": "Bidhaa zetu",
    "products.viewer.biscuit": "{brand}",
    "products.promoLabel": "Ofa",
    "order.title": "Oda yako ya {brand}",
    "order.cartEmptyCta": "Ongeza bidhaa ili kuanza.",
    "order.payment.cashHelp": "Masharti yatathibitishwa na {brand} kwenye WhatsApp.",
    "order.whatsapp.greeting": "Habari {brand}! Ningependa kuagiza:",
    "order.steps.products": "Chagua bidhaa zako",
    "order.next.toProducts": "Chagua bidhaa zangu",
    "contactPage.title": "Tuzungumze",
    "contactPage.intro": "Swali, oda maalum? Tuandikie au tupigie simu.",
    "contactPage.whatsappPrefill": "Habari {brand}, nina swali:",
    "notFound.title": "Lo, ukurasa huu umepotea!",
    "seo.siteName": "{brand}",
    "seo.titleTemplate": "%s · {brand}",
    "seo.defaultTitle": "{brand}",
    "seo.ogAlt": "{brand}",
    "seo.pages.home.title": "{brand}",
  },
};

function setPath(tree: Tree, path: string, value: unknown) {
  const parts = path.split(".");
  let node = tree;
  for (const part of parts.slice(0, -1)) {
    if (typeof node[part] !== "object" || node[part] === null || Array.isArray(node[part])) node[part] = {};
    node = node[part] as Tree;
  }
  node[parts[parts.length - 1]] = value as Tree;
}

/** Krumbz content of `locale` (already merged over French) → neutral base of another shop. */
export function neutralize<T>(krumbz: T, locale: PlatformLocale, brand: string): T {
  const tree = structuredClone(krumbz) as Tree;
  for (const { path, value } of BRAND_PATHS) setPath(tree, path, Array.isArray(value) ? [] : value);
  // brand.name is the shop name; mentions of {brand} are filled in.
  setPath(tree, "brand.name", brand);
  for (const [path, text] of Object.entries(NEUTRAL[locale] ?? NEUTRAL.fr)) setPath(tree, path, text.replaceAll("{brand}", brand));
  return tree as T;
}
