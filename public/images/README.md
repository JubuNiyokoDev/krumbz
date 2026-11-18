# Images du site Krumbz

> Fichier généré automatiquement par `npm run images:readme` à partir de `src/lib/assets/registry.ts`. Ne pas le modifier à la main.

22 fichiers attendus. Pour voir ceux qui manquent encore : `npm run todo`.

## Comment remplacer une image

1. Préparer l’image au **format**, à l’**orientation** et à la **taille** indiqués dans les tableaux ci-dessous.
2. La nommer **exactement** comme indiqué : même nom, tout en minuscules, sans espace ni accent, avec la bonne extension (`.jpg` ou `.png`, pas `.jpeg` ni `.JPG`).
3. La déposer dans le dossier indiqué (`public/images/…` ou `public/textures/…`), en écrasant le fichier existant s’il y en a un.
4. C’est tout : aucun code à modifier.
   - en développement (`npm run dev`), l’image apparaît **immédiatement** (recharger la page) ;
   - en production, elle est prise en compte au **prochain déploiement** (push sur la branche principale / redéploiement Vercel).

Tant qu’un fichier manque, le site affiche un **emplacement hachuré** qui indique le chemin exact attendu : rien n’est cassé.

## Règles générales

- **Photos → JPG** (scènes, histoire, partage). **Images détourées → PNG avec fond transparent** (produit). Les textures 3D sont en PNG.
- **Noms exacts, en minuscules.** Un fichier mal nommé est simplement ignoré.
- **Poids** : viser les tailles maximales indiquées. Compresser avant dépôt avec [Squoosh](https://squoosh.app) :
  - JPG : encodeur *MozJPEG*, qualité **75 à 82** ;
  - PNG transparent : *OxiPNG* (ou *Reduce palette* si l’image le permet) ;
  - le site produit ensuite lui-même les versions AVIF/WebP adaptées à chaque écran : inutile de les fournir.
- **Espace libre pour le produit 3D** : sur les scènes de l’accueil, le sachet et les biscuits 3D flottent par-dessus la photo. Garder une zone calme, sans visage ni élément important : **au centre-droit** en paysage, **dans le tiers inférieur** en portrait.
- **Pas de texte incrusté** dans les photos (il ne serait pas traduit et serait illisible sur téléphone), sauf sur l’image de partage et les étiquettes 3D.
- **Droits** : n’utiliser que des photos dont Crispy Food Products détient les droits (et l’accord des personnes photographiées).
- **Textures 3D** : après avoir déposé une texture, `npm run optimize:3d` peut produire une version optimisée (KTX2/WebP) plus légère ; le site l’utilise automatiquement si elle est plus récente que le PNG.

## Scènes de l’accueil

Chaque moment de vie existe en deux versions : **paysage** (ordinateur, tablette) et **portrait** (téléphone). Si une seule version est fournie, elle est utilisée partout.

| Fichier (dans `public/`) | Format | Orientation | Taille recommandée | Utilisation |
| --- | --- | --- | --- | --- |
| `images/scenes/couple-jardin-paysage.jpg` | JPG | paysage | 2400 × 1350 (16:9), < 400 Ko | Accueil, scène « À deux » : un couple au jardin — ordinateur et tablette en paysage. Laisser de l’espace libre au centre-droit pour le produit 3D. |
| `images/scenes/couple-jardin-portrait.jpg` | JPG | portrait | 1080 × 1920 (9:16), < 300 Ko | Accueil, scène « À deux » : un couple au jardin — téléphone. Laisser de l’espace libre dans le tiers inférieur pour le produit 3D. |
| `images/scenes/famille-maison-paysage.jpg` | JPG | paysage | 2400 × 1350 (16:9), < 400 Ko | Accueil, scène « En famille » : une famille à la maison — ordinateur et tablette en paysage. Laisser de l’espace libre au centre-droit pour le produit 3D. |
| `images/scenes/famille-maison-portrait.jpg` | JPG | portrait | 1080 × 1920 (9:16), < 300 Ko | Accueil, scène « En famille » : une famille à la maison — téléphone. Laisser de l’espace libre dans le tiers inférieur pour le produit 3D. |
| `images/scenes/classe-enseignant-paysage.jpg` | JPG | paysage | 2400 × 1350 (16:9), < 400 Ko | Accueil, scène « En classe » : un enseignant et ses élèves — ordinateur et tablette en paysage. Laisser de l’espace libre au centre-droit pour le produit 3D. |
| `images/scenes/classe-enseignant-portrait.jpg` | JPG | portrait | 1080 × 1920 (9:16), < 300 Ko | Accueil, scène « En classe » : un enseignant et ses élèves — téléphone. Laisser de l’espace libre dans le tiers inférieur pour le produit 3D. |
| `images/scenes/anniversaire-paysage.jpg` | JPG | paysage | 2400 × 1350 (16:9), < 400 Ko | Accueil, scène « Anniversaire » — ordinateur et tablette en paysage. Laisser de l’espace libre au centre-droit pour le produit 3D. |
| `images/scenes/anniversaire-portrait.jpg` | JPG | portrait | 1080 × 1920 (9:16), < 300 Ko | Accueil, scène « Anniversaire » — téléphone. Laisser de l’espace libre dans le tiers inférieur pour le produit 3D. |
| `images/scenes/mariage-paysage.jpg` | JPG | paysage | 2400 × 1350 (16:9), < 400 Ko | Accueil, scène « Mariage » — ordinateur et tablette en paysage. Laisser de l’espace libre au centre-droit pour le produit 3D. |
| `images/scenes/mariage-portrait.jpg` | JPG | portrait | 1080 × 1920 (9:16), < 300 Ko | Accueil, scène « Mariage » — téléphone. Laisser de l’espace libre dans le tiers inférieur pour le produit 3D. |
| `images/scenes/pause-bureau-paysage.jpg` | JPG | paysage | 2400 × 1350 (16:9), < 400 Ko | Accueil, scène « Au bureau » : pause entre collègues — ordinateur et tablette en paysage. Laisser de l’espace libre au centre-droit pour le produit 3D. |
| `images/scenes/pause-bureau-portrait.jpg` | JPG | portrait | 1080 × 1920 (9:16), < 300 Ko | Accueil, scène « Au bureau » : pause entre collègues — téléphone. Laisser de l’espace libre dans le tiers inférieur pour le produit 3D. |
| `images/scenes/amis-sortie-paysage.jpg` | JPG | paysage | 2400 × 1350 (16:9), < 400 Ko | Accueil, scène « Entre amis » : sortie entre amis — ordinateur et tablette en paysage. Laisser de l’espace libre au centre-droit pour le produit 3D. |
| `images/scenes/amis-sortie-portrait.jpg` | JPG | portrait | 1080 × 1920 (9:16), < 300 Ko | Accueil, scène « Entre amis » : sortie entre amis — téléphone. Laisser de l’espace libre dans le tiers inférieur pour le produit 3D. |

## Produit

Images détourées sur **fond transparent** (PNG) : elles servent d’image de repli quand la 3D est désactivée.

| Fichier (dans `public/`) | Format | Orientation | Taille recommandée | Utilisation |
| --- | --- | --- | --- | --- |
| `images/product/biscuit-top.png` | PNG | carré | 1024 × 1024, fond transparent | Vue de dessus d’un biscuit, bien centrée. Sert de texture de couleur au biscuit 3D et d’image de repli. |
| `images/product/biscuit-studio.png` | PNG | carré | 1600 × 1600, fond transparent | Photo studio des produits (sachet, carton, biscuits). Image de repli quand la 3D est désactivée. |

## Notre histoire

Photos des chapitres de la page « Notre histoire ».

| Fichier (dans `public/`) | Format | Orientation | Taille recommandée | Utilisation |
| --- | --- | --- | --- | --- |
| `images/story/burundi-collines.jpg` | JPG | paysage | 2400 × 1600 (3:2), < 450 Ko | Page « Notre histoire » : chapitre « Fabriqué au Burundi ». |
| `images/story/champignons.jpg` | JPG | paysage | 2400 × 1600 (3:2), < 450 Ko | Page « Notre histoire » : chapitre « L’origine champignon ». |

## Partage sur les réseaux (Open Graph)

Image affichée quand un lien du site est partagé (WhatsApp, Facebook, X…). Tant qu’elle manque, une carte générée automatiquement aux couleurs Krumbz est utilisée.

| Fichier (dans `public/`) | Format | Orientation | Taille recommandée | Utilisation |
| --- | --- | --- | --- | --- |
| `images/og/og-image.jpg` | JPG | paysage | 1200 × 630, < 300 Ko | Image de partage (Open Graph, WhatsApp, Facebook, X). |

## Textures 3D (dossier public/textures)

Étiquettes **à plat** appliquées sur le sachet et le carton 3D. Tant qu’elles manquent, les emballages 3D s’affichent sans étiquette.

| Fichier (dans `public/`) | Format | Orientation | Taille recommandée | Utilisation |
| --- | --- | --- | --- | --- |
| `textures/sachet-front.png` | PNG | portrait | 1024 × 1536 (2:3), étiquette à plat, sans transparence | Étiquette avant du sachet 3D (pillow pack). La zone utile doit couvrir toute l’image. |
| `textures/sachet-back.png` | PNG | portrait | 1024 × 1536 (2:3), étiquette à plat, sans transparence | Étiquette arrière du sachet 3D. |
| `textures/carton-label.png` | PNG | paysage | 2048 × 1024 (2:1), patron déplié | Étiquette du carton 3D. Patron horizontal : moitié gauche = face avant, moitié droite = face arrière ; le dessus et les côtés reprennent la couleur dominante. |

## Icônes du site

Les icônes (onglet du navigateur, écran d’accueil) sont dans `src/app/` : `icon.png` (512 × 512, fond transparent), `apple-icon.png` (180 × 180, fond opaque) et `favicon.ico` (16, 32 et 48 px). Elles sont générées par `npm run icons` à partir d’un pictogramme provisoire ; pour utiliser le logo officiel, remplacer ces trois fichiers en gardant les mêmes noms et tailles.
