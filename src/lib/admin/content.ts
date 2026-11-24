/**
 * Shop texts (tenant.content) in the single template's schema — EXACTLY the keys of content/site.fr.json:
 *   { fr: { home: { intro: { title } } … }, en: {…}, rn: {…}, sw: {…}, media: TenantMedia, gallery: {…} }
 * Each locale object is merged over the neutral interface strings, other locales fall back to French
 * (src/templates/boutique/content.ts). Absent sections are hidden on the storefront.
 * Pure helpers shared by the guided editor, the advanced JSON editor and the seeds.
 */
import { PLATFORM_LOCALES, type PlatformLocale, type TenantMedia } from "../tenant/types.ts";

export interface ContentField {
  /** Dotted path inside each locale object (content.<locale>.<key>). */
  key: string;
  label: string;
  multiline?: boolean;
  max: number;
}

/** Main brand texts offered by the guided editor (every other key stays editable through the JSON editor). */
export const CONTENT_FIELDS: ContentField[] = [
  { key: "brand.tagline", label: "Accroche de la marque", max: 120 },
  { key: "home.intro.eyebrow", label: "Accueil — surtitre", max: 80 },
  { key: "home.intro.title", label: "Accueil — titre", max: 120 },
  { key: "home.intro.subtitle", label: "Accueil — sous-titre", multiline: true, max: 400 },
  { key: "home.intro.packAlt", label: "Accueil — description de la photo produit", max: 200 },
  { key: "home.moments.eyebrow", label: "Moments — surtitre", max: 80 },
  { key: "home.moments.title", label: "Moments — titre", max: 120 },
  { key: "home.moments.subtitle", label: "Moments — introduction", multiline: true, max: 400 },
  { key: "home.fromMushroom.title", label: "Mise en avant (après l’intro) — titre", max: 120 },
  { key: "home.fromMushroom.text", label: "Mise en avant — texte", multiline: true, max: 600 },
  { key: "home.benefits.title", label: "Atouts — titre", max: 120 },
  { key: "home.mushroom.title", label: "Ingrédient / matière phare — titre", max: 120 },
  { key: "home.mushroom.intro", label: "Ingrédient / matière phare — introduction", multiline: true, max: 800 },
  { key: "home.products.title", label: "Accueil, produits — titre", max: 120 },
  { key: "home.products.subtitle", label: "Accueil, produits — sous-titre", multiline: true, max: 300 },
  { key: "home.cta.title", label: "Appel final — titre", max: 120 },
  { key: "home.cta.text", label: "Appel final — texte", multiline: true, max: 300 },
  { key: "products.title", label: "Page produits — titre", max: 120 },
  { key: "products.intro", label: "Page produits — introduction", multiline: true, max: 600 },
  { key: "story.title", label: "Notre histoire — titre", max: 120 },
  { key: "story.intro", label: "Notre histoire — introduction", multiline: true, max: 1200 },
  { key: "contactPage.intro", label: "Contact — introduction", multiline: true, max: 400 },
  { key: "seo.defaultDescription", label: "Référencement — description", multiline: true, max: 170 },
];

/** Non-localized images of the template sections (tenant.content.media). */
export const MEDIA_FIELDS: { key: keyof TenantMedia; label: string; list?: boolean }[] = [
  { key: "studio", label: "Photo produit principale (intro, repli)" },
  { key: "cutout", label: "Détourage posé sur les scènes (mode simplifié)" },
  { key: "og", label: "Image de partage 1200 × 630" },
  { key: "highlight", label: "Mise en avant après l’intro" },
  { key: "harvest", label: "Ingrédient / matière phare — photo portrait" },
  { key: "closeup", label: "Ingrédient / matière phare — gros plan" },
  { key: "ingredients", label: "Page produits — photo de la composition" },
  { key: "breaks", label: "Rappels entre les moments (une par rappel)", list: true },
  { key: "story", label: "Notre histoire — chapitres (une par chapitre)", list: true },
  { key: "journey", label: "Notre histoire — étapes (une par étape)", list: true },
];

export const MAX_CONTENT_BYTES = 256 * 1024;
const MAX_DEPTH = 10;

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

export function getAtPath(content: unknown, key: string): unknown {
  let node: unknown = content;
  for (const part of key.split(".")) {
    if (!isObject(node)) return undefined;
    node = node[part];
  }
  return node;
}

/** Text of a guided field in one locale ("" when absent). */
export function localeText(content: Json, locale: PlatformLocale, key: string): string {
  const value = getAtPath(content[locale], key);
  return typeof value === "string" ? value : "";
}

/** Immutable set (null removes the key, then empty parents). */
export function setAtPath(content: Json, key: string, value: unknown): Json {
  const [head, ...rest] = key.split(".");
  const copy: Json = { ...content };
  if (!rest.length) {
    if (value === null || value === undefined) delete copy[head];
    else copy[head] = value;
    return copy;
  }
  const child = setAtPath(isObject(copy[head]) ? (copy[head] as Json) : {}, rest.join("."), value);
  if (Object.keys(child).length) copy[head] = child;
  else delete copy[head];
  return copy;
}

const LOCALE_SET = new Set<string>(PLATFORM_LOCALES);
const MEDIA_KEYS = new Set<string>(MEDIA_FIELDS.map((f) => f.key));

/** Values allowed inside a locale object: strings, numbers, booleans, null, arrays and objects of those. */
function checkTexts(node: unknown, where: string, depth: number, problems: string[]): void {
  if (problems.length >= 5) return;
  if (depth > MAX_DEPTH) {
    problems.push(`${where} : imbrication trop profonde (maximum ${MAX_DEPTH} niveaux).`);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => checkTexts(item, `${where}[${i}]`, depth + 1, problems));
    return;
  }
  if (isObject(node)) {
    for (const [k, v] of Object.entries(node)) checkTexts(v, `${where}.${k}`, depth + 1, problems);
    return;
  }
  if (node !== null && !["string", "number", "boolean"].includes(typeof node)) problems.push(`${where} : valeur non prise en charge.`);
}

/** An image path: public path (/images/…), uploaded file (/uploads/…) or https URL. */
export function isMediaPath(value: unknown): value is string {
  return typeof value === "string" && (/^\/(?!\/)[^\s<>"]*$/.test(value) || /^https:\/\/[^\s<>"]+$/.test(value)) && !value.includes("..");
}

/** Problems of a whole tenant.content object (empty = valid). */
export function contentProblems(value: Json): string[] {
  const problems: string[] = [];
  for (const [key, node] of Object.entries(value)) {
    if (LOCALE_SET.has(key)) {
      if (!isObject(node)) problems.push(`${key} : doit être un objet de textes ({ … }).`);
      else checkTexts(node, key, 1, problems);
    } else if (key === "media") {
      if (!isObject(node)) {
        problems.push("media : doit être un objet ({ studio: \"/images/…\", … }).");
        continue;
      }
      for (const [mk, mv] of Object.entries(node)) {
        if (!MEDIA_KEYS.has(mk)) problems.push(`media.${mk} : clé inconnue.`);
        else if (Array.isArray(mv)) {
          mv.forEach((p, i) => {
            if (p !== null && p !== "" && !isMediaPath(p)) problems.push(`media.${mk}[${i}] : chemin d’image invalide.`);
          });
        } else if (mv !== null && mv !== "" && !isMediaPath(mv)) problems.push(`media.${mk} : chemin d’image invalide.`);
      }
    } else if (key === "gallery") {
      if (!isObject(node)) problems.push("gallery : doit être un objet.");
    } else {
      problems.push(`${key} : clé inconnue (attendu : fr, en, rn, sw, media, gallery).`);
    }
    if (problems.length >= 5) break;
  }
  if (value.fr !== undefined && !isObject(value.fr)) problems.push("fr : le français est la langue de référence.");
  return problems.slice(0, 5);
}

/** Validates the advanced JSON editor input. */
export function parseContentJson(raw: string): { ok: true; value: Json } | { ok: false; error: string } {
  if (new TextEncoder().encode(raw).length > MAX_CONTENT_BYTES) return { ok: false, error: "Contenu trop volumineux (256 Ko maximum)." };
  let value: unknown;
  try {
    value = JSON.parse(raw || "{}");
  } catch (error) {
    return { ok: false, error: `JSON invalide : ${(error as Error).message}` };
  }
  if (!isObject(value)) return { ok: false, error: "Le contenu doit être un objet JSON ({ … })." };
  const problems = contentProblems(value);
  if (problems.length) return { ok: false, error: problems.join(" ") };
  return { ok: true, value };
}

/** Placeholder marker of the starter texts: the admin replaces every text that starts with it. */
export const STARTER_MARK = "[À remplacer]";
const r = (text: string) => `${STARTER_MARK} ${text}`;

/**
 * Complete neutral French starter of a new shop in the template's schema: every optional section
 * is present with placeholders (no Krumbz text). Delete a section in the JSON editor to hide it.
 */
export function starterContent(shopName: string): Json {
  const fr = {
    brand: { tagline: r("Votre accroche en quelques mots") },
    home: {
      intro: {
        eyebrow: shopName,
        title: r("Votre promesse principale"),
        subtitle: r("Une ou deux phrases qui présentent vos produits et ce qui les rend uniques."),
        packAlt: r("Description de la photo de votre produit principal"),
      },
      moments: {
        eyebrow: "Pour chaque moment",
        title: r("Titre des moments de vie"),
        subtitle: r("Dans quels moments vos clients profitent-ils de vos produits ?"),
        breaks: [
          { eyebrow: r("Surtitre du rappel"), text: r("Une phrase sur votre ingrédient ou votre savoir-faire."), alt: r("Description de la photo") },
          { eyebrow: r("Surtitre du rappel"), text: r("Une seconde phrase pour rappeler votre différence."), alt: r("Description de la photo") },
        ],
      },
      fromMushroom: {
        eyebrow: r("Surtitre"),
        title: r("Ce qui fait votre différence"),
        text: r("Présentez votre matière première ou votre savoir-faire en quelques lignes."),
        alt: r("Description de la photo"),
        steps: [
          { title: r("Étape 1"), text: r("Description courte.") },
          { title: r("Étape 2"), text: r("Description courte.") },
          { title: r("Étape 3"), text: r("Description courte.") },
        ],
      },
      benefits: {
        eyebrow: "Pourquoi nous choisir",
        title: r("Ce qui rend vos produits uniques"),
        items: [
          { id: "crispy", title: r("Atout 1"), text: r("Une phrase.") },
          { id: "mushroom", title: r("Atout 2"), text: r("Une phrase.") },
          { id: "burundi", title: r("Atout 3"), text: r("Une phrase.") },
          { id: "everyone", title: r("Atout 4"), text: r("Une phrase.") },
        ],
        nutritionNote: "",
      },
      mushroom: {
        eyebrow: r("Surtitre"),
        title: r("Votre ingrédient ou matière phare"),
        intro: r("Racontez son origine et pourquoi vous l’avez choisi."),
        whyTitle: r("Ce qu’il apporte"),
        items: Array.from({ length: 6 }, (_, i) => ({ symbol: String(i + 1), title: r(`Qualité ${i + 1}`), text: r("Une phrase.") })),
        disclaimer: "",
        cta: "Voir nos produits",
        images: { harvestAlt: r("Description de la photo"), closeupAlt: r("Description du gros plan") },
      },
      products: { eyebrow: "Nos produits", title: r("Titre de la sélection"), subtitle: r("Une phrase sur votre gamme.") },
      cta: { title: "Envie de commander ?", text: "Commandez en quelques secondes : votre commande part directement sur WhatsApp." },
    },
    products: { title: "Nos produits", intro: r("Présentation de votre gamme.") },
    story: {
      eyebrow: "Notre histoire",
      title: r("Le titre de votre histoire"),
      intro: r("Qui êtes-vous, d’où venez-vous, pourquoi cette boutique ?"),
      chapters: [
        { id: "origine", title: r("Chapitre 1"), text: r("Quelques phrases."), alt: r("Description de la photo") },
        { id: "savoir-faire", title: r("Chapitre 2"), text: r("Quelques phrases."), alt: r("Description de la photo") },
      ],
      values: {
        title: "Ce qui nous guide",
        items: [
          { title: r("Valeur 1"), text: r("Une phrase.") },
          { title: r("Valeur 2"), text: r("Une phrase.") },
          { title: r("Valeur 3"), text: r("Une phrase.") },
        ],
      },
      journey: {
        eyebrow: r("Surtitre"),
        title: r("De la matière à vos mains"),
        intro: r("Les étapes de fabrication ou de sélection."),
        steps: [
          { title: r("Étape 1"), text: r("Une phrase."), alt: r("Description de la photo") },
          { title: r("Étape 2"), text: r("Une phrase."), alt: r("Description de la photo") },
          { title: r("Étape 3"), text: r("Une phrase."), alt: r("Description de la photo") },
        ],
      },
    },
    legal: {
      updated: r("Dernière mise à jour : date"),
      sections: [
        { title: "Éditeur du site", body: [r(`Nom ou raison sociale de ${shopName}, forme juridique, adresse, contact.`)] },
        { title: "Hébergement", body: ["Site hébergé par Rundinova Studio (Rundinova Tech), Burundi."] },
        { title: "Commandes", body: ["Les commandes sont confirmées sur WhatsApp ; prix, disponibilité et livraison sont confirmés à ce moment-là."] },
        { title: "Données personnelles", body: [r("Quelles données vous recevez (nom, téléphone, adresse) et comment vous les utilisez.")] },
      ],
    },
    seo: { defaultDescription: r(`${shopName} : une phrase de 150 caractères maximum pour les moteurs de recherche.`) },
  };
  return { fr };
}
