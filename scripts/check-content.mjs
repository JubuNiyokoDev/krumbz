#!/usr/bin/env node
/**
 * Vérifie la cohérence des fichiers de contenu traduits (content/site.*.json)
 * par rapport au français (content/site.fr.json), qui fait référence.
 *
 *   npm run content:check
 *
 * Erreurs (code de sortie 1) :
 *   - une clé n'existe pas en français (faute de frappe, clé obsolète) ;
 *   - le type d'une valeur diffère (texte / liste / objet…) ;
 *   - une liste n'a pas la même longueur, ou un élément n'a pas le même `id` ;
 *   - une donnée non traduisible (id, model, price, image, indent…) diffère ;
 *   - les variables ICU ({count}, {name}, {count, plural, …}) diffèrent ;
 *   - une langue ACTIVE (src/i18n/config.ts) a une clé de texte manquante.
 * Avertissements :
 *   - une valeur « À COMPLÉTER » en français a été remplie dans une seule langue ;
 *   - couverture partielle d'une langue prête mais inactive (ex. kirundi).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = path.join(root, "content");
// src/i18n/config.ts n'a aucun import : Node 24 l'exécute directement (type stripping).
const { ACTIVE_LOCALES, READY_LOCALES, DEFAULT_LOCALE } = await import(
  new URL("../src/i18n/config.ts", import.meta.url).href
);

const TO_COMPLETE = "À COMPLÉTER";
/** Champs de données : jamais traduits, doivent rester identiques au français. */
const DATA_KEYS = new Set(["id", "model", "price", "image", "indent", "e164", "number", "url", "network", "currency"]);
/** Données hors listes : identiques au français si elles sont présentes. */
const DATA_PATHS = new Set(["contact.whatsapp.number", "contact.mapUrl"]);
/** Chemins de données qui peuvent être omis (le français est alors utilisé). */
const OPTIONAL_PATHS = ["contact.phones", "contact.socials", "contact.whatsapp.number", "contact.whatsapp.display", "contact.mapUrl"];

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(contentDir, file), "utf8"));
const fr = readJson(`site.${DEFAULT_LOCALE}.json`);

const kind = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);
const isObject = (v) => kind(v) === "object";
const join = (base, key) => (base ? `${base}.${key}` : String(key));
const isOptional = (p) => OPTIONAL_PATHS.some((o) => p === o || p.startsWith(`${o}.`) || p.startsWith(`${o}[`));
const inMeta = (p) => p === "_meta" || p.startsWith("_meta.");

/**
 * Mini-analyseur ICU : renvoie l'ensemble des arguments "nom:type"
 * (type = "simple", "plural", "select", "selectordinal", "number"…).
 * Lève une erreur si les accolades sont déséquilibrées.
 */
export function icuArguments(message) {
  const args = new Set();
  let i = 0;
  const parseText = (nested) => {
    while (i < message.length) {
      const c = message[i];
      if (c === "{") {
        i++;
        parseArgument();
      } else if (c === "}") {
        if (!nested) throw new Error(`accolade fermante inattendue (position ${i})`);
        i++;
        return;
      } else i++;
    }
    if (nested) throw new Error("accolade non fermée");
  };
  const readUntil = (stops) => {
    const start = i;
    while (i < message.length && !stops.includes(message[i])) i++;
    if (i >= message.length) throw new Error("accolade non fermée");
    return message.slice(start, i).trim();
  };
  const parseArgument = () => {
    const name = readUntil([",", "}"]);
    if (!/^[A-Za-z_]\w*$/.test(name)) throw new Error(`nom de variable invalide « ${name} »`);
    if (message[i] === "}") {
      i++;
      args.add(`${name}:simple`);
      return;
    }
    i++; // ,
    const type = readUntil([",", "}"]);
    args.add(`${name}:${type}`);
    if (message[i] === "}") {
      i++;
      return;
    }
    i++; // ,
    if (!["plural", "select", "selectordinal"].includes(type)) {
      readUntil(["}"]); // style (number, date…)
      i++;
      return;
    }
    // Branches : sélecteur {message} … }
    for (;;) {
      const selector = readUntil(["{", "}"]);
      if (message[i] === "}") {
        if (selector.replace(/offset:\d+/, "").trim()) throw new Error(`branche sans message « ${selector} »`);
        i++;
        return;
      }
      if (!selector.replace(/offset:\d+/, "").trim()) throw new Error("branche sans sélecteur");
      i++; // {
      parseText(true);
    }
  };
  parseText(false);
  return args;
}

const errors = [];
const warnings = [];
const err = (locale, p, msg) => errors.push(`[${locale}] ${p} : ${msg}`);
const warn = (locale, p, msg) => warnings.push(`[${locale}] ${p} : ${msg}`);

function compare(locale, ref, value, p) {
  if (inMeta(p) && p !== "_meta") return; // _meta est libre (notes de traduction)
  const kr = kind(ref);
  const kv = kind(value);
  if (kr !== kv) {
    err(locale, p, `type ${kv} au lieu de ${kr}`);
    return;
  }
  if (kr === "object") {
    for (const [key, v] of Object.entries(value)) {
      const child = join(p, key);
      if (!(key in ref)) {
        if (!inMeta(child)) err(locale, child, "clé absente du français");
        continue;
      }
      // Données d'un élément de liste : déjà comparées à l'identique plus bas.
      if (p.endsWith("]") && DATA_KEYS.has(key)) continue;
      compare(locale, ref[key], v, child);
    }
    return;
  }
  if (kr === "array") {
    if (ref.length !== value.length) {
      err(locale, p, `liste de ${value.length} élément(s) au lieu de ${ref.length}`);
      return;
    }
    value.forEach((v, idx) => {
      const child = `${p}[${idx}]`;
      if (isObject(ref[idx]) && isObject(v)) {
        for (const key of Object.keys(ref[idx])) {
          if (!(key in v)) err(locale, `${child}.${key}`, "clé manquante dans un élément de liste (les listes remplacent le français en entier)");
        }
        for (const key of DATA_KEYS) {
          if (key in ref[idx] && key in v && JSON.stringify(ref[idx][key]) !== JSON.stringify(v[key])) {
            err(locale, `${child}.${key}`, `donnée ${JSON.stringify(v[key])} différente du français ${JSON.stringify(ref[idx][key])}`);
          }
        }
      }
      compare(locale, ref[idx], v, child);
    });
    return;
  }
  if (DATA_PATHS.has(p) && JSON.stringify(ref) !== JSON.stringify(value)) {
    err(locale, p, `donnée ${JSON.stringify(value)} différente du français ${JSON.stringify(ref)}`);
  }
  if (kr === "string") {
    let a;
    let b;
    try {
      a = icuArguments(ref);
    } catch (e) {
      err(DEFAULT_LOCALE, p, `ICU invalide : ${e.message}`);
      return;
    }
    try {
      b = icuArguments(value);
    } catch (e) {
      err(locale, p, `ICU invalide : ${e.message}`);
      return;
    }
    const missing = [...a].filter((x) => !b.has(x));
    const extra = [...b].filter((x) => !a.has(x));
    if (missing.length || extra.length) {
      err(locale, p, `variables ICU différentes (manquantes : ${missing.join(", ") || "—"} ; en trop : ${extra.join(", ") || "—"})`);
    }
    if (ref.includes(TO_COMPLETE) && !value.includes(TO_COMPLETE)) {
      warn(locale, p, `« ${TO_COMPLETE} » en français mais rempli ici : penser à compléter aussi le français`);
    }
    if (!ref.includes(TO_COMPLETE) && value.includes(TO_COMPLETE)) {
      warn(locale, p, `« ${TO_COMPLETE} » ici mais rempli en français : traduire la valeur`);
    }
  }
}

/** Liste les chemins feuilles du français absents de la langue (hors _meta et chemins optionnels). */
function missingLeaves(ref, value, p = "") {
  if (inMeta(p) || (p && isOptional(p))) return [];
  if (value === undefined) {
    if (isObject(ref)) return Object.keys(ref).flatMap((k) => missingLeaves(ref[k], undefined, join(p, k)));
    return [p];
  }
  if (isObject(ref) && isObject(value)) {
    return Object.keys(ref).flatMap((k) => missingLeaves(ref[k], value[k], join(p, k)));
  }
  return [];
}

const countLeaves = (ref, p = "") =>
  inMeta(p) || (p && isOptional(p)) ? 0 : isObject(ref) ? Object.keys(ref).reduce((n, k) => n + countLeaves(ref[k], join(p, k)), 0) : 1;

// Le français lui-même doit avoir un ICU valide.
(function checkFrench(node, p = "") {
  if (typeof node === "string") {
    try {
      icuArguments(node);
    } catch (e) {
      err(DEFAULT_LOCALE, p, `ICU invalide : ${e.message}`);
    }
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) checkFrench(v, Array.isArray(node) ? `${p}[${k}]` : join(p, k));
  }
})(fr);

const files = fs.readdirSync(contentDir).filter((f) => /^site\.[a-z]{2,3}\.json$/.test(f) && f !== `site.${DEFAULT_LOCALE}.json`);
const total = countLeaves(fr);
const summary = [];

for (const file of files.sort()) {
  const locale = file.split(".")[1];
  let data;
  try {
    data = readJson(file);
  } catch (e) {
    errors.push(`[${locale}] ${file} : JSON invalide (${e.message})`);
    continue;
  }
  compare(locale, fr, data, "");
  const missing = missingLeaves(fr, data);
  const active = ACTIVE_LOCALES.includes(locale);
  const status = active ? "active" : READY_LOCALES.includes(locale) ? "prête (inactive)" : "non déclarée";
  if (active && missing.length) {
    for (const m of missing) err(locale, m, "texte manquant pour une langue active (le français s'afficherait)");
  } else if (!active && missing.length && missing.length < total) {
    warn(locale, "—", `traduction partielle : ${missing.length} texte(s) reprennent le français`);
  }
  summary.push({ locale, status, translated: total - missing.length, total });
}

console.log("Contenu — vérification des traductions (référence : français)\n");
console.log("| Langue | Statut | Textes traduits |");
console.log("| --- | --- | --- |");
for (const s of summary) {
  const pct = Math.round((s.translated / s.total) * 100);
  console.log(`| ${s.locale} | ${s.status} | ${s.translated} / ${s.total} (${pct} %) |`);
}
if (warnings.length) {
  console.log(`\nAvertissements (${warnings.length}) :`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
}
if (errors.length) {
  console.error(`\nErreurs (${errors.length}) :`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log("\n✓ Aucune erreur.");
