# Boutique démo « Ikirenge Shoes » — médias

Médias de la boutique de démonstration du template « vitrine »
(`src/templates/vitrine/demo/shoes.ts`). **Tout est provisoire** : à remplacer par
de vraies photos avant toute utilisation publique.

## Modèle 3D — crédit obligatoire

`models/ikirenge-sneaker.glb` (≈ 590 Ko) est une version optimisée
(`scripts/optimize-gltf.mjs` : dedup, prune, weld, textures WebP ≤ 1024 px,
compression Meshopt) du modèle **« Materials Variants Shoe »**,
**© 2021 Shopify, licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)**,
publié dans les [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/MaterialsVariantsShoe).
Ses trois variantes de matériaux (`KHR_materials_variants`) sont les coloris
Midnight, Beach et Street.

La licence impose un crédit visible : il est affiché dans le pied de page de la
boutique (clé `tenant.content.credits`). Ne pas le retirer tant que ce modèle
(ou les rendus ci-dessous, qui en sont dérivés) est utilisé.

## Images actuelles (provisoires)

| Fichier | Nature |
| --- | --- |
| `images/runner-midnight.webp`, `runner-beach.webp`, `runner-street.webp` | Rendus du modèle 3D ci-dessus (même licence CC BY 4.0) |
| `images/*.svg` (autres produits) | Illustrations vectorielles étiquetées « photo à fournir » |
| `images/scene-*.svg` | Illustrations des scènes, étiquetées « photo à fournir » |

## Photos à fournir par le propriétaire

Format conseillé : WebP (ou JPEG) ; **produits** carrés 1000 × 1000 px minimum,
chaussure entière sur fond uni clair ou détourée (PNG/WebP transparent idéal),
cadrage identique d'une photo à l'autre ; **scènes** paysage 1600 × 1000 px
minimum (ratio 16:10), sujet au centre, bas de l'image assez calme (le texte s'y
superpose). Garder le même nom de fichier en `.webp` puis mettre à jour l'URL
dans `shoes.ts` (ou dans la base une fois la boutique amorcée).

| # | Fichier attendu | Contenu |
| --- | --- | --- |
| 1 | `runner-midnight.webp` | Ikirenge Runner, coloris Midnight, profil |
| 2 | `runner-beach.webp` | Ikirenge Runner, coloris Beach |
| 3 | `runner-street.webp` | Ikirenge Runner, coloris Street |
| 4 | `mocassin-rohero-cognac.webp` | Mocassin Rohero cuir cognac, profil |
| 5 | `mocassin-rohero-noir.webp` | Mocassin Rohero cuir noir |
| 6 | `sandale-tanganyika-profil.webp` | Sandale Tanganyika, profil |
| 7 | `sandale-tanganyika-dessus.webp` | Sandale Tanganyika, vue de dessus ou autre coloris |
| 8 | `bottine-kibira-profil.webp` | Bottine Kibira, profil |
| 9 | `bottine-kibira-arriere.webp` | Bottine Kibira, vue arrière ou trois-quarts |
| 10 | `ballerine-imena-rose.webp` | Ballerine Imena rose poudré, profil |
| 11 | `ballerine-imena-noir.webp` | Ballerine Imena noire |
| 12 | `inyange-kids-profil.webp` | Basket enfant Inyange Kids bleue, profil |
| 13 | `inyange-kids-autre.webp` | Basket enfant Inyange Kids rose |
| 14 | `scene-matin.webp` | Scène « En route » : rue de Bujumbura le matin, une personne en baskets |
| 15 | `scene-lac.webp` | Scène « Pause au lac » : plage du lac Tanganyika, sandales aux pieds |
| 16 | `scene-soiree.webp` | Scène « Soirée » : soirée / cérémonie, mocassins |
| 17 | `scene-collines.webp` | Scène « Collines » : sentier de terre rouge, bottines |
| 18 | (optionnel) `logo.svg` | Logo de la boutique (sinon le nom s'affiche en texte) |

Les personnes reconnaissables sur les photos de scènes doivent avoir donné leur
accord. Les photos de produits peuvent rester sans modèle 3D : le template les
présente alors en « cartes en relief » (inclinaison au pointeur / gyroscope,
lumière mobile, parallaxe, carrousel en profondeur).
