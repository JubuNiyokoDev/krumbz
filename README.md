# Krumbz — site officiel

Vitrine e-commerce immersive des biscuits **Krumbz** (Crispy Food Products, Burundi) — « Simple, Croustillant ».
Les produits (biscuit, sachet, carton) sont en vraie 3D WebGL et accompagnent le visiteur, au défilement, à travers des scènes de la vie quotidienne présentées en images.

- **Stack** : Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · three.js + React Three Fiber + drei · GSAP + ScrollTrigger · Lenis · zustand · next-intl · detect-gpu · gltf-transform
- **Pages** : Accueil, Produits (visionneuse 3D), Notre histoire, Commander (panier + WhatsApp), Contact, Mentions légales, 404 animée
- **Langues** : français (défaut, sans préfixe), anglais (`/en`), kirundi prêt à traduire

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

- Anglais : `content/site.en.json` (même structure). Toute clé absente reprend le français.
- Kirundi : `content/site.rn.json` est prêt à traduire. Une fois traduit, activez la langue en déplaçant `"rn"` de
  `READY_LOCALES` vers `ACTIVE_LOCALES` dans `src/i18n/config.ts`, et ajoutez les chemins traduits dans
  `src/i18n/routing.ts` si besoin.
- Lancez `npm run content:check` après chaque modification.

---

## 4. Déploiement (Docker sur VPS, automatique)

Le site est livré en conteneur Docker et déployé automatiquement à chaque `git push` sur `main`, via
`.github/workflows/deploy.yml` :

1. **Build** : installe les dépendances, `typecheck`, `lint`, `content:check`, puis construit l'image Docker
   (`Dockerfile`, build Next.js en mode `standalone`) et la pousse sur
   [GitHub Container Registry](https://ghcr.io) : `ghcr.io/jubuniyokodev/krumbz:latest`.
2. **Deploy** : envoie `docker-compose.yml` sur le VPS (`/opt/krumbz`) puis exécute
   `docker compose pull && docker compose up -d` par SSH.
3. Sur le VPS, nginx (hors conteneur) sert `https://krumbz.rundinova.com` et `https://www.krumbz.rundinova.com`
   (certificat Let's Encrypt, renouvellement automatique via `certbot.timer`) et reverse-proxy vers le conteneur
   (`127.0.0.1:19200`).

**Secrets du dépôt GitHub** (Settings → Secrets and variables → Actions) : `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`
(clé privée dédiée au déploiement). `GITHUB_TOKEN` (fourni automatiquement) suffit pour pousser l'image sur GHCR.

**Variable d'environnement** : `NEXT_PUBLIC_SITE_URL` est fixée à `https://krumbz.rundinova.com` au moment du build
Docker (`build-args` du workflow) — elle sert aux balises canoniques, Open Graph et au sitemap.

### Build et lancement manuels (sans CI)

```bash
docker build -t krumbz --build-arg NEXT_PUBLIC_SITE_URL=https://krumbz.rundinova.com .
docker run --rm -p 3000:3000 krumbz
```

### Déploiement manuel sur le VPS (dépannage)

```bash
ssh root@31.97.33.141
cd /opt/krumbz
docker compose pull && docker compose up -d
docker compose logs -f
```

---

## 5. Architecture

```
content/                    Textes (site.fr.json = référence, site.en.json, site.rn.json)
public/images/              Photos (scènes, produits, histoire, og) — voir public/images/README.md
public/textures/            Étiquettes appliquées sur les modèles 3D
public/models/              Ressources 3D générées (cartes de relief du biscuit, modèles optimisés)
scripts/                    Outils : copie des fichiers tiers, 3D, images, budgets, Lighthouse, contenu
src/app/[locale]/           Pages (une par route, chemins localisés)
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

_(Liste générée par `npm run todo`, mise à jour à la livraison.)_
