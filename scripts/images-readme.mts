#!/usr/bin/env node
/**
 * Génère public/images/README.md à partir du registre des images
 * (src/lib/assets/registry.ts → IMAGE_SLOTS).
 *
 *   npm run images:readme
 *
 * Ne pas modifier public/images/README.md à la main : modifier le registre
 * puis relancer ce script.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ImageSlot } from "../src/lib/assets/registry";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// registry.ts n'a aucun import : Node 24 l'exécute directement (type stripping).
const registryUrl = new URL("../src/lib/assets/registry.ts", import.meta.url).href;
const { IMAGE_SLOTS } = (await import(registryUrl)) as { IMAGE_SLOTS: ImageSlot[] };

const exists = (p: string) => {
  try {
    const stat = fs.statSync(path.join(root, "public", p));
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
};

const GROUPS: { title: string; prefix: string; intro: string }[] = [
  {
    title: "Scènes de l’accueil",
    prefix: "/images/scenes/",
    intro:
      "Chaque moment de vie existe en deux versions : **paysage** (ordinateur, tablette) et **portrait** (téléphone). Si une seule version est fournie, elle est utilisée partout.",
  },
  {
    title: "Produit",
    prefix: "/images/product/",
    intro: "Images détourées sur **fond transparent** (PNG) : elles servent d’image de repli quand la 3D est désactivée.",
  },
  { title: "Notre histoire", prefix: "/images/story/", intro: "Photos des chapitres de la page « Notre histoire »." },
  {
    title: "Partage sur les réseaux (Open Graph)",
    prefix: "/images/og/",
    intro:
      "Image affichée quand un lien du site est partagé (WhatsApp, Facebook, X…). Tant qu’elle manque, une carte générée automatiquement aux couleurs Krumbz est utilisée.",
  },
  {
    title: "Textures 3D (dossier public/textures)",
    prefix: "/textures/",
    intro:
      "Étiquettes **à plat** appliquées sur le sachet et le carton 3D. Tant qu’elles manquent, les emballages 3D s’affichent sans étiquette.",
  },
];

const esc = (s: string) => s.replace(/\|/g, "\\|");
const lines: string[] = [];
const total = IMAGE_SLOTS.length;
const present = IMAGE_SLOTS.filter((s) => exists(s.path)).length;

lines.push(
  "# Images du site Krumbz",
  "",
  "> Fichier généré automatiquement par `npm run images:readme` à partir de `src/lib/assets/registry.ts`. Ne pas le modifier à la main.",
  "",
  `${total} fichiers attendus. Pour voir ceux qui manquent encore : \`npm run todo\`.`,
  "",
  "## Comment remplacer une image",
  "",
  "1. Préparer l’image au **format**, à l’**orientation** et à la **taille** indiqués dans les tableaux ci-dessous.",
  "2. La nommer **exactement** comme indiqué : même nom, tout en minuscules, sans espace ni accent, avec la bonne extension (`.jpg` ou `.png`, pas `.jpeg` ni `.JPG`).",
  "3. La déposer dans le dossier indiqué (`public/images/…` ou `public/textures/…`), en écrasant le fichier existant s’il y en a un.",
  "4. C’est tout : aucun code à modifier.",
  "   - en développement (`npm run dev`), l’image apparaît **immédiatement** (recharger la page) ;",
  "   - en production, elle est prise en compte au **prochain déploiement** (push sur la branche principale / redéploiement Vercel).",
  "",
  "Tant qu’un fichier manque, le site affiche un **emplacement hachuré** qui indique le chemin exact attendu : rien n’est cassé.",
  "",
  "## Règles générales",
  "",
  "- **Photos → JPG** (scènes, histoire, partage). **Images détourées → PNG avec fond transparent** (produit). Les textures 3D sont en PNG.",
  "- **Noms exacts, en minuscules.** Un fichier mal nommé est simplement ignoré.",
  "- **Poids** : viser les tailles maximales indiquées. Compresser avant dépôt avec [Squoosh](https://squoosh.app) :",
  "  - JPG : encodeur *MozJPEG*, qualité **75 à 82** ;",
  "  - PNG transparent : *OxiPNG* (ou *Reduce palette* si l’image le permet) ;",
  "  - le site produit ensuite lui-même les versions AVIF/WebP adaptées à chaque écran : inutile de les fournir.",
  "- **Espace libre pour le produit 3D** : sur les scènes de l’accueil, le sachet et les biscuits 3D flottent par-dessus la photo. Garder une zone calme, sans visage ni élément important : **au centre-droit** en paysage, **dans le tiers inférieur** en portrait.",
  "- **Pas de texte incrusté** dans les photos (il ne serait pas traduit et serait illisible sur téléphone), sauf sur l’image de partage et les étiquettes 3D.",
  "- **Droits** : n’utiliser que des photos dont Crispy Food Products détient les droits (et l’accord des personnes photographiées).",
  "- **Textures 3D** : après avoir déposé une texture, `npm run optimize:3d` peut produire une version optimisée (KTX2/WebP) plus légère ; le site l’utilise automatiquement si elle est plus récente que le PNG.",
  "",
);

for (const group of GROUPS) {
  const slots = IMAGE_SLOTS.filter((s) => s.path.startsWith(group.prefix));
  if (!slots.length) continue;
  lines.push(`## ${group.title}`, "", group.intro, "", "| Fichier (dans `public/`) | Format | Orientation | Taille recommandée | Utilisation |", "| --- | --- | --- | --- | --- |");
  for (const s of slots) {
    lines.push(
      `| \`${esc(s.path.slice(1))}\` | ${s.format.toUpperCase()} | ${s.orientation} | ${esc(s.size)} | ${esc(s.usage)} |`,
    );
  }
  lines.push("");
}

const others = IMAGE_SLOTS.filter((s) => !GROUPS.some((g) => s.path.startsWith(g.prefix)));
if (others.length) {
  lines.push("## Autres images", "", "| Fichier (dans `public/`) | Format | Orientation | Taille recommandée | Utilisation |", "| --- | --- | --- | --- | --- |");
  for (const s of others) {
    lines.push(`| \`${esc(s.path.slice(1))}\` | ${s.format.toUpperCase()} | ${s.orientation} | ${esc(s.size)} | ${esc(s.usage)} |`);
  }
  lines.push("");
}

lines.push(
  "## Icônes du site",
  "",
  "Les icônes (onglet du navigateur, écran d’accueil) sont dans `src/app/` : `icon.png` (512 × 512, fond transparent), `apple-icon.png` (180 × 180, fond opaque) et `favicon.ico` (16, 32 et 48 px). Elles sont générées par `npm run icons` à partir d’un pictogramme provisoire ; pour utiliser le logo officiel, remplacer ces trois fichiers en gardant les mêmes noms et tailles.",
  "",
);

const out = path.join(root, "public/images/README.md");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, lines.join("\n"));
console.log(`✓ public/images/README.md généré (${total} emplacements ; ${present} fichier(s) déjà fourni(s)).`);
