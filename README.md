# Rundinova Studio — plateforme de boutiques en ligne

Plateforme multi-vendeurs : une seule boutique par sous-domaine, un seul modèle (celui de Krumbz), des thèmes,
textes, produits et scènes propres à chaque vendeur. **Krumbz** est la boutique #1 et la référence de parité
(« Simple, Croustillant », Crispy Food Products, Burundi) ; le site officiel reste `rundinova.com`.

**Production ouverte le 25 novembre 2026** : `https://isoko.rundinova.com` (site public),
`https://admin.rundinova.com` (super-administration), `https://espace.rundinova.com` (espace vendeur),
`https://krumbz.rundinova.com` (boutique Krumbz). Voir le **[rapport final](docs/rapport-final.md)** pour l'état
opérationnel, les identifiants de production (stockés sur le VPS, pas dans le dépôt) et les procédures de retour arrière.

- **Stack** : Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · three.js + React Three Fiber + drei · GSAP + ScrollTrigger · Lenis · zustand · next-intl · detect-gpu · gltf-transform
- **Pages** : Accueil, Produits (visionneuse 3D), Notre histoire, Commander (panier + WhatsApp), Contact, Mentions légales, 404 animée
- **Langues** : français (défaut, sans préfixe), anglais (`/en`), kirundi (`/rn`), swahili (`/sw`) — les 4 actives et complètes

---

## 1. Installation et lancement

Prérequis : **Node.js 20.9 ou plus** (testé avec Node 24) et npm.

```bash
npm install          # installe les dépendances et copie les fichiers 3D tiers dans /public
npm run dev          # http://localhost:3000
```

Production en local :

```bash
npm run build
npm run start
```

### Scripts utiles

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm run start` | Build et serveur de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript |
| `npm run test:e2e` | Tests Playwright, bureau 1440×900 et mobile 390×844 (après `npm run build`) |
| `npm run budgets` | Vérifie les budgets de poids (page initiale < 1,5 Mo, 3D ≤ 3 Mo) |
| `npm run lighthouse` | Audit Lighthouse mobile 4G (serveur lancé sur le port 3000) |
| `npm run content:check` | Vérifie la cohérence des fichiers de langue |
| `npm run todo` | Liste tous les éléments « À COMPLÉTER » et les images manquantes |
| `npm run images:readme` | Régénère `public/images/README.md` |
| `npm run optimize:3d` | Optimise les textures 3D (KTX2 si `toktx` est installé, sinon WebP) |

Astuce de test : ajoutez `?mode=static` ou `?mode=3d` à une URL pour forcer l'affichage en images fixes ou en 3D.

---

## 2. Ajouter les images

Toutes les images attendues (nom exact, format, orientation, taille conseillée, usage) sont listées dans
**[`public/images/README.md`](public/images/README.md)**.

1. Déposez le fichier avec **exactement** le nom indiqué (minuscules, même extension), par exemple
   `public/images/scenes/couple-jardin-paysage.jpg`.
2. En développement (`npm run dev`), rechargez la page : l'image remplace automatiquement le placeholder hachuré.
3. En production, l'image apparaît au prochain déploiement.

Les placeholders sont volontairement visibles (hachures dorées + chemin du fichier attendu) tant qu'une image manque.

**Textures 3D** (`public/textures/sachet-front.png`, `sachet-back.png`, `carton-label.png`, et
`public/images/product/biscuit-top.png` pour la couleur du biscuit) : elles sont appliquées sur les modèles 3D dès qu'elles
existent. Pour réduire leur poids, lancez ensuite `npm run optimize:3d` (crée des versions `.webp`, et `.ktx2` si
[KTX-Software](https://github.com/KhronosGroup/KTX-Software/releases) est installé) ; le site choisit automatiquement la
version optimisée la plus récente.

### Cadrage des scènes

- Les zones des visages et du sachet de chaque photo de scène sont décrites dans `src/lib/assets/scene-framing.ts`.
  **Si vous remplacez une photo de scène, mettez à jour ses zones**, puis vérifiez avec
  `npm run build && npm run test:e2e -- tests/scene-framing.spec.ts` (captures dans `test-results/`).
- **Ordinateur** : photo plein écran, texte et produit 3D sur le côté « libre » (mur, pelouse, lac). Les photos où les
  personnes occupent toute la largeur (`desktop: "card"`) sont montrées entières dans une carte, sur un fond flou de
  la même photo : rien n'est recadré.
- **Téléphone** : tant qu'il n'y a pas de `-portrait.jpg`, la photo paysage s'affiche dans une bande dont la hauteur et
  le point focal sont calculés pour garder tous les visages et le sachet visibles. Un `-portrait.jpg` déposé est
  utilisé automatiquement en plein écran.

Les photos du vrai produit (sachet, étiquette, biscuit) servent de référence dans `references/produit-reel/`
(non publié, non versionné).

---

## 3. Modifier les textes

**Tous les textes** du site (titres, bienfaits, ingrédients, valeurs nutritionnelles, prix, formats, contacts, adresse,
mentions légales, SEO) sont dans un seul fichier : **`content/site.fr.json`**.

- Modifiez la valeur, enregistrez : la page se met à jour en développement.
- Les valeurs inconnues sont marquées « À COMPLÉTER » et apparaissent sur le site sous forme de badge discret.
- **Prix** : dans `products.items[].price`, mettez un nombre en francs burundais (ex. `1500`) à la place de `null`, et
  le texte affiché dans `priceDisplay`. Le panier calcule alors le sous-total.
- **WhatsApp** : `contact.whatsapp.number` (chiffres seulement, avec l'indicatif 257).
- **Réseaux sociaux** : renseignez `contact.socials[].url` ; les liens vides ne sont pas affichés.
- Ne jamais ajouter d'allégation nutritionnelle ou de santé non validée.

### Langues

4 langues actives, chacune avec son propre fichier de contenu (`content/site.{en,rn,sw}.json`, même structure que
`site.fr.json`, la référence) et ses propres chemins d'URL (`src/i18n/routing.ts`) : anglais (`/en`), kirundi
(`/rn`), swahili (`/sw`). Toute clé absente dans une traduction reprend automatiquement le français.

- **Kirundi** (`content/site.rn.json`) a été traduit avec l'aide d'une IA (voir `_meta.important` dans le fichier) :
  une relecture par une personne de langue maternelle kirundi est recommandée avant une communication officielle.
- **Swahili** (`content/site.sw.json`) : traduction complète.
- Pour ajouter une 5ᵉ langue : créer `content/site.xx.json` (copier la structure, traduire chaque texte, jamais les
  champs `id`/`model`/`price`/`image`/`indent`, ni les variables `{comme_ceci}`), ajouter `"xx"` dans
  `ACTIVE_LOCALES` et une entrée dans `LOCALE_LABELS` (`src/i18n/config.ts`), puis les chemins localisés dans
  `src/i18n/routing.ts`.
- Lancez `npm run content:check` après chaque modification : il vérifie la structure, les variables ICU et le taux
  de traduction de chaque langue.

---

## 4. Déploiement (Docker sur VPS, automatique)

Chaque `git push` sur `main` déclenche `.github/workflows/deploy.yml` : vérifications (`typecheck`, `lint`,
`content:check`, tests), build de l'image `ghcr.io/jubuniyokodev/rundinova-studio:<sha>` puis promotion de `:latest`,
et exécution de `/opt/rundinova-studio/scripts/deploy.sh` sur le VPS. Le service ponctuel `migrate` applique les
SQL de `drizzle/` avant le démarrage de l'app.

Sur le VPS, l'app écoute sur `127.0.0.1:19300` et la base PostgreSQL tourne dans `rundinova-studio-db`. nginx sert
les hôtes `isoko`, `admin`, `espace` et le joker `*.rundinova.com`, et reverse-proxy `krumbz.rundinova.com` vers la
plateforme (l'ancien conteneur `krumbz` sur `19200` est conservé pour retour arrière). Les certificats Let's Encrypt
sont émis en HTTP-01 par `rundinova-studio-certs.timer` et chargés dynamiquement par nginx — aucun changement DNS,
aucun CDN. Voir [`deploy/nginx/APPLY.md`](deploy/nginx/APPLY.md) et [`docs/ops.md`](docs/ops.md).

**Secrets du dépôt GitHub** (Settings → Secrets and variables → Actions) : `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`
(clé privée dédiée au déploiement). `GITHUB_TOKEN` (fourni automatiquement) suffit pour pousser l'image sur GHCR.

**Variables d'environnement** : `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`,
`PLATFORM_ROOT_DOMAIN`, `CERT_REQUESTS_DIR` / `CERT_STATUS_DIR` — voir `deploy/env.production.example` et
`/opt/rundinova-studio/.env` sur le VPS (jamais versionné).

### Contrôle et lancement manuels (dépannage)

```bash
ssh root@31.97.33.141
docker ps --filter name=rundinova-studio
curl -H "Host: admin.rundinova.com" http://127.0.0.1:19300/api/health
cd /opt/rundinova-studio && bash scripts/health.sh
bash scripts/backup.sh --label manuel
```

---

## 5. Architecture

```
content/                    Textes (site.fr.json = référence, site.en.json, site.rn.json, site.sw.json)
public/images/              Photos (scènes, produits, histoire, og) — voir public/images/README.md
public/textures/            Étiquettes appliquées sur les modèles 3D
public/models/              Ressources 3D générées (cartes de relief du biscuit, modèles optimisés)
scripts/                    Outils : copie des fichiers tiers, 3D, images, budgets, Lighthouse, contenu
src/app/tpl/boutique/[tenant]/[locale]  Pages de chaque boutique (modèle unique, chemins localisés)
src/components/three/       Scène WebGL : biscuit procédural, sachet « pillow pack », carton, parcours au scroll, visionneuse
src/components/experience/  Ancres DOM qui placent les produits 3D dans chaque section
src/components/layout/      En-tête, pied de page, défilement fluide, transitions « porte », panier
src/lib/                    Contenu, images, détection de l'appareil, commande WhatsApp, paiement, SEO
src/store/                  États partagés (panier persistant, état de la 3D)
tests/                      Tests Playwright
```

**Parcours 3D** : chaque section de l'accueil contient une ancre invisible (`data-stage-anchor`). Le canvas WebGL fixe
projette les produits sur ces ancres et interpole leurs poses au défilement (GSAP ScrollTrigger + Lenis). Le rendu se
fait à la demande (aucun calcul quand rien ne bouge), avec un pixel ratio plafonné selon la puissance de l'appareil.

**Repli automatique** : sur un appareil peu puissant, en mode économie de données, avec « réduire les animations » ou
si WebGL échoue, la 3D n'est pas chargée et des images fixes des produits la remplacent.

**Paiement mobile** : `src/lib/order/payment.ts` définit une interface `PaymentProvider`. Lumicash et EcoCash y sont
déclarés (désactivés). Pour les brancher : implémenter `initiate()` via une route serveur (`src/app/api/payments/...`)
qui appelle l'API de l'opérateur avec des identifiants stockés en variables d'environnement, puis passer `available: true`.

---

## 6. Éléments « À COMPLÉTER »

Liste à jour : `npm run todo`. État au 20 novembre 2026 — visibles par le public :

| Sujet | Où | Clé dans `content/site.fr.json` |
| --- | --- | --- |
| Conditions de conservation (ex. « à l'abri de la chaleur et de l'humidité ») | Produits | `products.ingredients.storage` |
| Valeurs nutritionnelles : énergie (kcal), acides gras saturés, sucres, fibres, sel | Produits | `products.nutrition.rows[…].value` |
| Histoire de Crispy Food Products, date de création | Notre histoire | `story.chapters[0].text` |
| Livraison : zones, délais, frais | Commander | `order.delivery.text` |

Facultatif (le site fonctionne sans) : versions `-portrait.jpg` des scènes, étiquettes à plat du sachet et du carton
(`public/textures/`). La traduction kirundi (`content/site.rn.json`) existe et est active, mais gagnerait à être
relue par une personne de langue maternelle kirundi.
