#!/usr/bin/env node
/**
 * Liste tout ce qui reste à fournir par Crispy Food Products, en Markdown :
 *   - chaque valeur « À COMPLÉTER » des fichiers content/*.json (avec son chemin de clé) ;
 *   - chaque image du registre (src/lib/assets/registry.ts) absente de /public.
 *
 *   npm run todo                 → affiche le rapport
 *   npm run todo -- --out FILE   → l'écrit aussi dans FILE
 *   npm run todo -- --strict     → code de sortie 1 s'il reste des éléments (CI)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { IMAGE_SLOTS } = await import(new URL("../src/lib/assets/registry.ts", import.meta.url).href);
const TO_COMPLETE = "À COMPLÉTER";

const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const outFile = outIndex >= 0 ? args[outIndex + 1] : null;
const strict = args.includes("--strict");

/** Parcourt un JSON et renvoie [chemin, valeur] pour chaque texte contenant « À COMPLÉTER ». */
function findToComplete(node, p = "") {
  if (typeof node === "string") return node.includes(TO_COMPLETE) ? [[p, node]] : [];
  if (Array.isArray(node)) return node.flatMap((v, i) => findToComplete(v, `${p}[${i}]`));
  if (node && typeof node === "object") {
    return Object.entries(node).flatMap(([k, v]) => (k === "_meta" && !p ? [] : findToComplete(v, p ? `${p}.${k}` : k)));
  }
  return [];
}

const fileExists = (p) => {
  try {
    const stat = fs.statSync(path.join(root, "public", p));
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
};

const md = [];
const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
let count = 0;

md.push("# Krumbz — éléments à fournir", "");

const contentDir = path.join(root, "content");
const files = fs
  .readdirSync(contentDir)
  .filter((f) => /^site\.[a-z]{2,3}\.json$/.test(f))
  .sort((a, b) => (a === "site.fr.json" ? -1 : b === "site.fr.json" ? 1 : a.localeCompare(b)));

md.push("## Textes « À COMPLÉTER »", "");
md.push(
  "Le français (`content/site.fr.json`) fait référence ; les autres langues reprennent le français pour toute clé absente.",
  "",
);
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(contentDir, file), "utf8"));
  const items = findToComplete(data);
  md.push(`### \`content/${file}\` — ${items.length} valeur(s)`, "");
  if (!items.length) {
    md.push(file === "site.fr.json" ? "Rien à compléter." : "Aucune valeur « À COMPLÉTER » dans ce fichier (les clés absentes reprennent le français).", "");
    continue;
  }
  count += items.length;
  md.push("| Clé | Valeur actuelle |", "| --- | --- |");
  for (const [key, value] of items) md.push(`| \`${key}\` | ${cell(value)} |`);
  md.push("");
}

const missing = IMAGE_SLOTS.filter((s) => !fileExists(s.path));
count += missing.length;
md.push(`## Images manquantes — ${missing.length} / ${IMAGE_SLOTS.length}`, "");
if (missing.length) {
  md.push("Détails et règles : `public/images/README.md`.", "");
  md.push("| Fichier (dans `public/`) | Format | Taille recommandée | Utilisation |", "| --- | --- | --- | --- |");
  for (const s of missing) md.push(`| \`${s.path.slice(1)}\` | ${s.format.toUpperCase()} | ${cell(s.size)} | ${cell(s.usage)} |`);
} else {
  md.push("Toutes les images sont fournies.");
}
md.push("");

const report = md.join("\n");
process.stdout.write(report);
if (outFile) {
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  fs.writeFileSync(outFile, report);
  console.error(`\n✓ Rapport écrit dans ${outFile}`);
}
if (strict && count > 0) process.exit(1);
