/**
 * Template texts (tenant.content): every text is a Localized object stored at a dotted path,
 * e.g. content.hero.title = { fr: "…", en: "…" } (shape read by the "vitrine" template).
 * Pure helpers shared by the guided editor and the advanced JSON editor.
 */
import { PLATFORM_LOCALES, type Localized, type PlatformLocale } from "../tenant/types.ts";

export interface ContentField {
  key: string;
  label: string;
  multiline?: boolean;
  max: number;
}

/** Known keys offered by the guided editor (other keys stay editable through the JSON editor). */
export const CONTENT_FIELDS: ContentField[] = [
  { key: "tagline", label: "Accroche (sous le nom)", max: 160 },
  { key: "hero.eyebrow", label: "Accueil — surtitre", max: 80 },
  { key: "hero.title", label: "Accueil — titre", max: 120 },
  { key: "hero.subtitle", label: "Accueil — sous-titre", multiline: true, max: 400 },
  { key: "hero.cta", label: "Accueil — bouton", max: 40 },
  { key: "about.title", label: "À propos — titre", max: 120 },
  { key: "about.text", label: "À propos — texte", multiline: true, max: 2000 },
  { key: "scenesIntro.title", label: "Scènes — titre", max: 120 },
  { key: "scenesIntro.text", label: "Scènes — introduction", multiline: true, max: 600 },
  { key: "collection.title", label: "Collection — titre", max: 120 },
  { key: "collection.text", label: "Collection — introduction", multiline: true, max: 600 },
  { key: "footerNote", label: "Pied de page", max: 240 },
  { key: "seo.title", label: "Référencement — titre de la page", max: 70 },
  { key: "seo.description", label: "Référencement — description", multiline: true, max: 170 },
];

export const MAX_CONTENT_BYTES = 64 * 1024;
const MAX_DEPTH = 8;

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

export function getAtPath(content: Json, key: string): unknown {
  let node: unknown = content;
  for (const part of key.split(".")) {
    if (!isObject(node)) return undefined;
    node = node[part];
  }
  return node;
}

export function getLocalizedAt(content: Json, key: string): Partial<Record<PlatformLocale, string>> {
  const value = getAtPath(content, key);
  if (!isObject(value)) return {};
  const out: Partial<Record<PlatformLocale, string>> = {};
  for (const locale of PLATFORM_LOCALES) if (typeof value[locale] === "string") out[locale] = value[locale] as string;
  return out;
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

/** An object whose keys are all platform locales is a Localized text: it needs a non-empty fr and string values. */
function checkNode(node: unknown, where: string, depth: number, problems: string[]): void {
  if (problems.length >= 5) return;
  if (depth > MAX_DEPTH) {
    problems.push(`${where || "racine"} : imbrication trop profonde (maximum ${MAX_DEPTH} niveaux).`);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => checkNode(item, `${where}[${i}]`, depth + 1, problems));
    return;
  }
  if (!isObject(node)) return;
  const keys = Object.keys(node);
  if (keys.length && keys.every((k) => LOCALE_SET.has(k))) {
    if (typeof node.fr !== "string" || !node.fr.trim()) problems.push(`${where} : le texte français (fr) est obligatoire.`);
    for (const k of keys) if (typeof node[k] !== "string") problems.push(`${where}.${k} : doit être une chaîne de caractères.`);
    return;
  }
  for (const k of keys) checkNode(node[k], where ? `${where}.${k}` : k, depth + 1, problems);
}

/** Validates the advanced JSON editor input. */
export function parseContentJson(raw: string): { ok: true; value: Json } | { ok: false; error: string } {
  if (new TextEncoder().encode(raw).length > MAX_CONTENT_BYTES) return { ok: false, error: "Contenu trop volumineux (64 Ko maximum)." };
  let value: unknown;
  try {
    value = JSON.parse(raw || "{}");
  } catch (error) {
    return { ok: false, error: `JSON invalide : ${(error as Error).message}` };
  }
  if (!isObject(value)) return { ok: false, error: "Le contenu doit être un objet JSON ({ … })." };
  const problems: string[] = [];
  checkNode(value, "", 0, problems);
  if (problems.length) return { ok: false, error: problems.join(" ") };
  return { ok: true, value };
}

/** Starter texts of a new vitrine (French only; the vendor or the super-admin translates). */
export function starterContent(shopName: string, values: Partial<Record<string, Localized>> = {}): Json {
  let content: Json = {};
  const defaults: Record<string, Localized> = {
    "hero.title": { fr: shopName },
    "hero.cta": { fr: "Commander sur WhatsApp" },
  };
  for (const [key, value] of Object.entries({ ...defaults, ...values })) if (value) content = setAtPath(content, key, value);
  return content;
}
