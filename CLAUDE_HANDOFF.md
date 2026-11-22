# CLAUDE_HANDOFF — passation technique (Krumbz → Rundinova Studio)

> Rédigé le **dimanche 22 novembre 2026 vers 14 h 40 (CAT, Africa/Bujumbura)** par OpenCode, pendant que Claude Code
> était bloqué par sa limite de 5 heures (**réinitialisation annoncée à 17 h 50, Africa/Bujumbura**).
> Ce document est un **instantané**. Le propriétaire peut continuer à travailler avec OpenCode avant ton retour :
> **compare l'état réel avec la section 14 « Instantané de référence »** avant de reprendre quoi que ce soit.

---

## ⚡ MISE À JOUR — exécution par OpenCode (22/11, à partir de 15 h)

**Les sections 0 à 14 ci-dessous décrivent l'état AVANT cette exécution.** État actuel :

| Chantier | Où | État |
| --- | --- | --- |
| Fondation + Krumbz | branche `worktree-agent-a83dbf0482966955e`, commit `7ee442c` | **Terminé et commité**. Corrections : sitemap https (`robots.ts`), `usePathname` qui ignore l'arbre interne `/tpl/…` (nouveau `src/i18n/use-pathname.ts`, le sélecteur de langue pointait vers `/en/tpl/krumbz/…`). Tests exécutés : tsc, eslint, build OK ; isolation 14/14 ; Playwright 172/172 ; parité 28/28. |
| **Intégration** | worktree `.claude/worktrees/integration`, branche **`rundinova-studio`** (depuis `main` + merge Fondation) | Commits `d0095f0` (sessions, upload d'images sharp, `/uploads/…`, `/api/health`, `/api/health/shops`, `npm run admin:create`), `1a31124` (stats anonymes `POST /api/stats` + `StatsBeacon`, page « Boutique en pause » stylée). Vérifié à la main (curl + base). |
| Template vitrine + démo | worktree `agent-acf0da094577cf6c6` | Sous-agent OpenCode en cours |
| Site Isoko | worktree `agent-a7b73284bd5c699cf` | Sous-agent OpenCode en cours |
| Infra | worktree `agent-a34a8658d1eb2f743` | Sous-agent OpenCode en cours |
| Espace vendeur | worktree `.claude/worktrees/espace`, branche `studio-espace` (depuis `d0095f0`), base locale `rundinova_espace` | Sous-agent OpenCode en cours |
| Super-admin | worktree `.claude/worktrees/admin`, branche `studio-admin` (depuis `d0095f0`), base locale `rundinova_admin` | Sous-agent OpenCode en cours |

Ordre d'intégration prévu dans `rundinova-studio` : template vitrine → Isoko → espace → admin → infra, puis branchement
des routes (`/tpl/vitrine/…`, `/marketing/[locale]`), seed de la boutique démo `ikirenge`, tests complets.
Les agents Claude Code d'origine (même worktrees) **ne doivent pas être relancés** en parallèle : le travail a été repris.

---

## 0. Reprise en 60 secondes

- **Projet** : le site Krumbz (biscuits MARIE au champignon, en production sur `krumbz.rundinova.com`) est en cours de
  transformation en **Rundinova Studio**, une plateforme multi-vendeurs (vitrines immersives, commandes WhatsApp).
- **Référence de pilotage** : `docs/plan.md` (architecture, étapes 0 à 11) et `docs/progress.md` (suivi). Le
  propriétaire a exigé qu'en cas d'interruption tu reprennes **à partir de `docs/progress.md`**.
- **Branche `main`** : propre, 3 commits de documentation en avance sur `origin/main` (non poussés).
- **Quatre sous-agents** travaillaient en parallèle dans des worktrees Git sous `.claude/worktrees/`. **Tous ont été
  coupés par la limite** entre 14 h 28 et 14 h 30. **Aucun n'a commité son travail.** Tout est en fichiers non
  commités dans les worktrees.
- **Prochaine action** : terminer et commiter la **Fondation** (worktree `agent-a83dbf0482966955e`). Elle est la plus
  avancée (build OK, parité visuelle 28/28, isolation 14/14) et bloque les étapes 2, 3, 4, 6 et 7. Voir §11.
- **Ne recrée aucun sous-agent ni worktree** : reprends les agents existants (SendMessage) ou continue dans leurs
  worktrees.

---

## 1. Méthode et niveau de certitude

Sources réellement consultées (lecture seule) :

| Source | Contenu |
| --- | --- |
| `git status / log / worktree list / diff` (dépôt principal + 4 worktrees) | État du code |
| `docs/plan.md`, `docs/progress.md`, `README.md`, `AGENTS.md` | Plan, décisions, documentation |
| Transcription Claude Code `~/.claude/projects/-home-jubuniyoko-development-js-ViteJs-krumbz-website/04a11ba5-ee4b-4a9d-a941-6f69fc2efbff.jsonl` | Demandes du propriétaire, réponses, messages aux sous-agents |
| Transcriptions des sous-agents `…/04a11ba5-…/subagents/agent-*.jsonl` + `.meta.json` | Consignes reçues, dernières actions, résultats de tests |
| `ps`, `ss`, `docker ps` | Processus et services locaux |
| Vérifications relancées par OpenCode (lecture seule) | `tsc --noEmit --incremental false` (principal + worktrees), `eslint`, `content:check`, `todo` |

Conventions de ce document :
- **[Vérifié]** : constaté directement (commande, fichier, sortie d'outil dans une transcription).
- **[Déclaré]** : affirmé par Claude Code ou un sous-agent dans sa transcription, non revérifié par OpenCode.
- **[Inconnu]** : information non disponible.

OpenCode n'a **pas** relancé de build, de suite Playwright ni de migration, pour ne pas toucher aux serveurs locaux
ni aux données.

---

## 2. Contexte et objectif

### 2.1 Krumbz (existant, en production)
Site officiel des biscuits Krumbz, en ligne sur `https://krumbz.rundinova.com` (conteneur `krumbz` sur le VPS,
`127.0.0.1:19200`, `/opt/krumbz`). Dernier déploiement réussi : commit `26cff63` (21/11) **[Déclaré]**.

### 2.2 Rundinova Studio (en cours)
Demande du propriétaire du 22/11 à 11 h 31 UTC (texte intégral dans la transcription principale). Points clés :
- Studio d'image pour petits vendeurs ; **pas un e-commerce** : pas de compte client, pas de paiement en ligne, pas de
  commandes stockées ; commandes envoyées sur le WhatsApp du vendeur.
- Offre (modifiable en super-admin) : pack de lancement **50 000 FBu** (chemise avec QR code, création de la vitrine,
  1er mois), puis **10 000 FBu/mois sans engagement** ; impayé → « Boutique en pause » automatique.
- Livrables : fondation multi-vendeurs (sous-domaines), Krumbz migré à l'identique (preuve par captures),
  espace vendeur (FR + kirundi, mobile d'abord), super-administration, 3D/visuels réutilisables, vitrine Rundinova,
  statistiques anonymes, infra Docker avec limites, sauvegardes, surveillance, préproduction, bascule sans coupure,
  README et `docs/rapport-final.md`.
- **Mode de travail exigé** : autonomie, mais demander avant toute action risquée pour la production / les autres
  projets du VPS, irréversible, ou ayant un impact sur les coûts. Un commit par étape terminée. Tenir
  `docs/progress.md` à jour après chaque étape. Contrôle qualité à chaque étape : build, lint, TypeScript, tests,
  Playwright bureau 1440×900 et mobile 390×844, budgets de performance.

---

## 3. Architecture actuelle

### 3.1 Sur `main` (Krumbz mono-site, en production)
**[Vérifié]** Next.js **16.4.6** (App Router, Turbopack), React 19.3, TypeScript strict, Tailwind 4.3, next-intl 4
(fr par défaut, en, rn, sw ; chemins localisés, ex. `/produits` ↔ `/en/products`), three 0.187 + R3F 9 + drei 10,
GSAP + ScrollTrigger, Lenis, zustand, sharp. Sortie `standalone` pour Docker.

```
content/site.{fr,en,rn,sw}.json   Tous les textes (fr = référence)
src/app/[locale]/                 Pages : accueil, produits, notre-histoire, commander, contact, mentions-legales, [...rest]
src/components/three/             Scène WebGL (biscuit procédural, sachet, carton, parcours au scroll, visionneuse)
src/components/experience/        Ancres DOM (data-stage-anchor) qui placent la 3D dans les sections
src/components/{layout,ui,order,sections,seo}/
src/lib/                          contenu, images, détection appareil, commande WhatsApp, paiement (désactivé), SEO
src/lib/tenant/types.ts           CONTRAT PARTAGÉ multi-vendeurs (commit d928c78) — non utilisé par le code de main
src/proxy.ts                      Middleware next-intl (Next 16 : proxy.ts et non middleware.ts)
src/store/                        Panier persistant, état 3D
tests/*.spec.ts                   Playwright (bureau + mobile)
tests/parity/krumbz.spec.ts       Parité visuelle (28 captures), config playwright.parity.config.ts
scripts/                          vendor, 3D, budgets, Lighthouse, contenu, todo, icônes
Dockerfile, docker-compose.yml    Image standalone ; déploiement par .github/workflows/deploy.yml
```

Attention Next 16 : lire `node_modules/next/dist/docs/` avant d'écrire du code (cf. `AGENTS.md`).

### 3.2 Architecture cible (`docs/plan.md` §2–4, en cours dans les worktrees)
- **Une seule app Next.js multi-locataire** ; `src/proxy.ts` lit `Host` et réécrit en interne :
  - `<slug>.rundinova.com/<path>` → `/tpl/<template>/<slug>/<locale>/<path>` (ou `/paused/<slug>/<locale>` si en pause)
  - `isoko.rundinova.com` → `/marketing/<locale>/…` ; `espace.…` → `/espace/<locale>/…` ; `admin.…` → `/admin/…`
  - `staging-<x>.rundinova.com` → comme `<x>`
  - `rundinova.com`, `www`, slug réservé ou inconnu → 404
  - Dev : `<slug>.localhost:3000` ou `localhost:3000/?tenant=<slug>` (mémorisé en cookie `rs-dev-tenant`) ; `localhost` nu = marketing.
- **PostgreSQL 16 dédié** en conteneur, **Drizzle ORM** + migrations SQL versionnées (`drizzle/`).
- Templates : `krumbz` (code sur mesure existant, inchangé) et `vitrine` (générique : glTF optimisé ou présentation photo immersive).
- Auth maison (scrypt, sessions en base, cookie HttpOnly/Secure/SameSite=Lax, limitation des tentatives).
- Conteneurs prévus : `rundinova-studio` (640 Mo / 1 CPU, port 127.0.0.1:19300), `rundinova-studio-db` (256 Mo / 0,5 CPU),
  `rundinova-studio-staging` (512 Mo / 0,5 CPU, 127.0.0.1:19301, arrêté par défaut).
- HTTPS : Let's Encrypt HTTP-01 par hôte, certificat chargé dynamiquement par nginx (`$ssl_server_name`), sans rechargement ; pas de CDN.

---

## 4. Fonctionnalités

### 4.1 Terminées (sur `main`, déployées en production)
**[Vérifié dans le code / Déclaré pour la production]**
- Site Krumbz complet : 6 pages × 4 langues réelles (fr, en, rn, sw), `content:check` 276/276 clés par langue **[Vérifié]**.
- Expérience 3D au scroll (17 scènes), visionneuse produit, repli image automatique (appareil faible, économie de données,
  reduced-motion, WebGL logiciel).
- Panier + commande guidée envoyée sur WhatsApp ; paiement mobile déclaré mais **désactivé** (`src/lib/order/payment.ts`).
- Infos produit relevées sur le vrai sachet, section champignon (ikizinu), plus aucun « À COMPLÉTER » rendu publiquement
  (le seul reste est le libellé `common.toComplete`, protégé par un garde-fou et un test) **[Vérifié via `npm run todo`]**.
- SEO (JSON-LD, OG, sitemap, robots), déploiement Docker automatique via GitHub Actions.
- Tests : 172 tests Playwright verts sur le build final du 21/11 **[Déclaré]**.
- Lighthouse mobile production du 21/11 **[Vérifié dans `reports/lighthouse/*.json`]** :

| Page | Perf | A11y | BP | SEO | LCP |
| --- | --- | --- | --- | --- | --- |
| Accueil | **64** | 100 | 100 | 100 | **3,4 s** |
| Produits | 96 | 100 | 100 | 100 | 1,6 s |
| Notre histoire | 95 | 100 | 100 | 100 | 1,6 s |
| Commander | 96 | 100 | 100 | 100 | 1,4 s |
| Contact | 99 | 100 | 100 | 100 | 2,0 s |
| Mentions légales | 99 | 100 | 100 | 100 | 1,3 s |

### 4.2 Rundinova Studio — terminé et commité sur `main`
- Étape « audit VPS » (lecture seule) et plan : `docs/plan.md` §1–8 (commits `d928c78`, `bc54af8`, `096de34`).
- **Étape 0** : référence visuelle Krumbz, **28 captures** (14 bureau + 14 mobile) dans `reports/parity/{desktop,mobile}/`,
  stables sur 2 passes **[Déclaré]** ; config `playwright.parity.config.ts`, spec `tests/parity/krumbz.spec.ts`.
  ⚠ `reports/` est **ignoré par Git** : ces 28 images n'existent **que sur cette machine**. Ne pas les supprimer ni les régénérer.
- Contrat partagé `src/lib/tenant/types.ts` (Tenant, TenantTheme, Product, TenantScene, StorefrontData, Localized,
  `RESERVED_SLUGS` incluant `isoko` et `tech`, `SLUG_PATTERN`, `TemplateId = "krumbz" | "vitrine"`).

### 4.3 En cours (non commité, dans les worktrees) — détail en §6
1. Fondation multi-vendeurs + migration Krumbz (étapes 1 et 2) — **très avancée**.
2. Template générique « vitrine » + boutique démo chaussures (étape 5) — **partielle**.
3. Site vitrine Rundinova Studio `isoko.rundinova.com` (étape 6) — **avancée**.
4. Infrastructure en fichiers (étape 8) — **partielle**.

### 4.4 Non commencées
- Étape 3 : espace vendeur (UI). Seuls le schéma et les helpers utilisateurs existent dans la Fondation.
- Étape 4 : super-administration (UI, QR code HD, abonnements, paiements, réinitialisation mot de passe + lien WhatsApp, santé).
- Étape 7 : statistiques anonymes (seule la table `stats_daily` existe).
- Étape 9 : préproduction (déploiement staging, recette, Lighthouse par boutique).
- Étape 10 : bascule de Krumbz (nécessite l'accord du propriétaire).
- Étape 11 : README de livraison + `docs/rapport-final.md`.
- Endpoint `GET /api/health/shops` attendu par `scripts/ops/health.sh` : absent partout **[Vérifié]**.
- Chantier performance de l'accueil Krumbz (LCP 3,4 s > objectif 2,5 s) : proposé par Claude le 21/11, non lancé.

---

## 5. État Git

### 5.1 Dépôt principal **[Vérifié]**
- Branche : `main`, **en avance de 3 commits** sur `origin/main` (`26cff63`). Rien n'est poussé depuis `26cff63`.
- Aucune modification suivie non commitée. Aucun stash. Aucun conflit.
- Non suivis : `.vscode/` et `images-a-integre/` (6 photos sources de champignons, déjà intégrées et optimisées dans
  `public/images/champignons/` au commit `26cff63`). Le `.gitignore` contient `/images-a-integrer/` (avec un « r ») :
  le dossier réel n'est donc pas ignoré. Ne pas le supprimer sans l'accord du propriétaire.

Commits récents :
```
096de34 22/11 14:16 docs: D2 révisée — aucun changement DNS, HTTPS Let's Encrypt dynamique, staging arrêtable
bc54af8 22/11 14:04 docs: décisions D1–D3 (isoko.rundinova.com, Cloudflare, R2)
d928c78 22/11 13:57 docs: plan Rundinova Studio, audit VPS, référence visuelle Krumbz, contrat multi-vendeurs
26cff63 21/11 15:18 feat: le champignon (ikizinu) au cœur du site, plus aucun « À COMPLÉTER » public   ← origin/main, en production
22c64ad 20/11 15:39 feat: site traduisible en 4 langues réelles (fr, en, rn, sw)                      ← fait par OpenCode
```

⚠ **Pousser `main` déclenche `.github/workflows/deploy.yml`** : suite Playwright complète (~17 min), puis rebuild et
**redéploiement du conteneur Krumbz de production**. Ne pas pousser sans l'accord du propriétaire.

### 5.2 Worktrees des sous-agents **[Vérifié]**
Dossier `.claude/worktrees/` (ignoré par Git dans le dépôt principal).

| Worktree / branche | Base | Agent | Verrou | Modifs suivies | Non suivis | Commit propre |
| --- | --- | --- | --- | --- | --- | --- |
| `agent-a83dbf0482966955e` | `ac57629` (cherry-pick de `bc54af8`) | Fondation + Krumbz | **verrouillé** (pid 1498171) | 27 (dont 13 renommages indexés) | 20+ chemins | aucun |
| `agent-acf0da094577cf6c6` | `d928c78` | Template vitrine + démo | non | 0 | `src/templates/`, `public/demo/`, `scripts/optimize-gltf.mjs` | aucun |
| `agent-a7b73284bd5c699cf` | `d928c78` | Site Rundinova (isoko) | **verrouillé** (pid 1498171) | 1 (`src/proxy.ts`, temporaire) | `src/marketing/`, `content/rundinova/`, `src/app/(dev)/` | aucun |
| `agent-a34a8658d1eb2f743` | `096de34` | Infra | non | 0 | `deploy/`, `scripts/ops/` | aucun |

Le verrou `locked` vient du processus Claude Code **toujours vivant** (pid 1498171, extension VS Code, session
`04a11ba5-ee4b-4a9d-a941-6f69fc2efbff`). **Ne lance ni `git worktree remove`, ni `prune`, ni `unlock`.**

Les worktrees ont un `node_modules` copié par liens physiques (`cp -al`) depuis le dépôt principal : Turbopack refuse un
lien symbolique. Le `node_modules` principal n'a **pas** été modifié par l'installation de Drizzle dans la Fondation
(`node_modules/drizzle-orm` absent du principal) **[Vérifié]**. Le worktree Infra n'a pas de `node_modules`.

---

## 6. Travail des sous-agents (un par un)

Tous ont été lancés le 22/11 entre 11 h 58 et 11 h 59 UTC par la session principale, en arrière-plan, modèle
claude-opus-5-5. Tous se sont arrêtés sur l'erreur `rate_limit` (HTTP 429). D'après Claude Code, leur travail est
conservé et chacun peut être relancé par **SendMessage** une fois la limite levée, plutôt qu'en créant un nouvel agent.
Consignes communes : commits en français terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ;
validation unique à la fin (tsc, eslint, build, tests ciblés) ; ne pas modifier `src/lib/tenant/types.ts`.

### 6.1 Fondation multi-vendeurs + migration Krumbz — `agent-a83dbf0482966955e`
**Périmètre** : `src/lib/db/**`, `src/lib/tenant/**` (sauf `types.ts`), `src/proxy.ts`, `src/i18n/**`, restructuration
de `src/app/`, `scripts/seed-krumbz.*`, `drizzle.config.ts`, dépendances, tests d'isolation.

**Fait [Vérifié dans les fichiers]** :
- Dépendances : `drizzle-orm`, `pg`, `drizzle-kit`, `@types/pg`. Scripts npm : `db:generate`, `db:migrate`,
  `db:seed:krumbz`, `test:isolation`. `tsconfig.json` : `allowImportingTsExtensions: true`. `.gitignore` : `!.env.example`.
- Schéma Drizzle `src/lib/db/schema.ts` + migration `drizzle/0000_init.sql`. 14 tables : `tenants`, `tenant_features`,
  `tenant_certificates`, `products`, `product_images`, `media`, `users` (avec `must_change_password`), `sessions`,
  `login_attempts`, `subscriptions`, `payments`, `stats_daily`, `settings`, `audit_log`.
- Accès aux données : `src/lib/db/{client,mappers,users}.ts` (`hasDatabase`, `getDb`, `hashPassword`, `verifyPassword`,
  `generateTemporaryPassword`, `resetPasswordWithTemporary`, `changePassword`) ;
  `src/lib/tenant/scoped.ts` → **`forTenant(tenantId)`**, l'unique point d'accès autorisé côté vendeur ;
  `storefront.ts` → `getTenantBySlug`, `getStorefrontData` (cache Next + tags `tenants` / `tenantTag`), `revalidateTenant`,
  `listStorefrontParams` (renvoie `[]` sans base : build possible sans `DATABASE_URL`) ;
  `queries.ts`, `hosts.ts` (`resolveHost`, `PLATFORM_SUBDOMAINS`), `request-host.ts`, `route-cache.ts` (cache mémoire slug → template/statut) ;
  `certs.ts` (`requestCertificate`, `getCertificateStatus`, `recordCertificateStatus`, échange par fichiers).
- Routage : `src/proxy.ts` réécrit (+107 lignes). L'arbre Krumbz est **déplacé** par `git mv` de `src/app/[locale]/` vers
  `src/app/tpl/krumbz/[tenant]/[locale]/` (et `sitemap.ts` vers `tpl/krumbz/[tenant]/`). Routes réservées :
  `src/app/admin/`, `src/app/espace/[locale]/`, `src/app/marketing/[locale]/`, `src/app/paused/[tenant]/[locale]/`
  (+ `PausedStorefront.tsx`, simple espace réservé), `src/app/tpl/vitrine/[tenant]/[locale]/`.
  Registre des templates : `src/templates/registry.ts`, `src/templates/krumbz/content.ts`. i18n : `src/i18n/platform*.ts`.
- Composants Krumbz modifiés pour lire la base : `Footer.tsx`, `PriceTag.tsx`, `OrganizationJsonLd.tsx`, `ProductJsonLd.tsx`, `src/lib/content.ts`, `src/i18n/request.ts`, `robots.ts`, `global-not-found.tsx`.
- Configs Playwright adaptées (`playwright.config.ts`, `playwright.parity.config.ts`) au mécanisme d'hôte.
- `scripts/db-migrate.mts`, `scripts/seed-krumbz.mts`, `tests/isolation/tenant-isolation.test.mts`, `.env.example`, `.env.local` (git-ignoré, non lu).

**Résultats de tests [Déclaré, sorties visibles dans la transcription]** :
- `db:migrate` OK ; `db:seed:krumbz` lancé 2 fois (idempotent) → « krumbz : 2 produit(s) visible(s), contacts et WhatsApp importés ».
- `test:isolation` : **14/14 réussis**, 4 suites.
- `next typegen` puis `tsc` et `eslint` : aucune sortie d'erreur.
- `next build` : exit 0 (routes `/tpl/krumbz/krumbz/{fr,en,rn,sw}/…` générées statiquement).
- Sondage du routage par `Host` sur `next start -p 3320` : comportement attendu (ex. `/en/produits` → 307 `/en/products`).
- **Parité visuelle : 28/28 réussis** (`exit=0, 28 passed (2.2m)`), à 14 h 30, juste avant la coupure.
- OpenCode a relancé `tsc --noEmit` dans ce worktree : **0 erreur [Vérifié]**.

**Reste à faire** (dernier message de l'agent : « robots sitemap proto should be https unless local; I'll fix it after parity ») :
1. `src/app/robots.ts` : protocole du sitemap en `https` hors environnement local.
2. Lancer **une fois** la suite Playwright existante sur ce build (`PW_BASE_URL=http://localhost:3320 npx playwright test`) et corriger les régressions. **Non lancée.**
3. Vérifier que `package-lock.json` (+15 819 / −7 111 lignes) ne contient qu'un changement attendu (ajout des dépendances, pas un changement de format npm accidentel).
4. Commit(s) sur la branche `worktree-agent-a83dbf0482966955e` + rapport (schéma, routage, API d'accès aux données, commandes, parité).
5. Intégrer le commit `096de34` (docs) absent de cette branche.

### 6.2 Template générique « vitrine » + boutique démo — `agent-acf0da094577cf6c6`
**Périmètre** : `src/templates/vitrine/**`, `public/demo/**`, `scripts/optimize-gltf.mjs`, route de prévisualisation
`src/app/(dev)/demo-vitrine/**` (noindex). Ne touche pas `src/proxy.ts`, `src/i18n/**`, `src/app/[locale]/**`, `src/lib/db/**`.
API exigée : `export function VitrineStorefront(props: { data: StorefrontData; page: "home" | "products" | "product" | "order" | "contact"; productSlug?: string })`,
style uniquement depuis `tenant.theme`, textes depuis `tenant.content/scenes/products` (repli `fr`), drapeaux `features` respectés.

**Fait [Vérifié]** : `scripts/optimize-gltf.mjs` ; `public/demo/models/ikirenge-sneaker.glb` (605 Ko, optimisé depuis le
modèle Khronos *MaterialsVariantsShoe* de 7,8 Mo) ; `src/templates/vitrine/` : `lib/` (i18n, content, theme, links, cart,
context, ui, view), `components/` (Shell, Header, CartDrawer, Stepper, AddToCart, Relief, ProductCard, DepthCarousel,
Parallax, primitives), `three/` (control, ModelCanvas, ModelStage), `sections/` (Hero, Scenes, FeaturedJourney), `vitrine.css`.
`tsc` dans ce worktree : seules erreurs = `PageProps` introuvable dans les pages Krumbz existantes, car `next typegen` n'a
pas été lancé ici. Ce n'est pas lié au template **[Vérifié]**.

**Pas fait [Vérifié par absence]** : point d'entrée `VitrineStorefront` (aucune occurrence), pages produits/produit/
commande/contact du template, `src/templates/vitrine/demo/shoes.ts` (vendeur fictif « Ikirenge Shoes », 6 produits,
4 langues), route `src/app/(dev)/demo-vitrine/`, crédit de licence, captures, build, commit, rapport.
Dernier message : « Now writing the template. Starting with lib modules. » L'agent écrivait les sections au moment de la coupure.

**Licence du modèle 3D [Vérifié]** : *MaterialsVariantsShoe* © 2021 Shopify, **CC BY 4.0**. Un crédit visible est
**obligatoire** (pas encore ajouté).

### 6.3 Site vitrine Rundinova Studio — `agent-a7b73284bd5c699cf`
**Périmètre** : `src/marketing/**`, `content/rundinova/{fr,rn,en,sw}.json`, route `src/app/(dev)/rundinova-preview/**`.
API : `RundinovaHome({ locale, offer: { launchPrice, monthlyPrice, currency: "BIF" }, shops, whatsappNumber })`.
Hôte décidé : **isoko.rundinova.com** (URLs canoniques/OG). Numéro WhatsApp inconnu → espace réservé `25700000000` signalé.

**Fait [Vérifié]** : `src/marketing/` complet (RundinovaHome, sections Hero, HowItWorks, Shops, WhyImage, Offer, Faq,
Contact, Footer, Marquee ; composants Header, LeadForm, QrMock, ShaderBackdrop, HeroBackdrop, MotionRoot…, `content.ts`,
`fonts.ts`, `metadata.ts`, `rundinova.css`), les 4 fichiers `content/rundinova/*.json`, la route de prévisualisation.
`tsc` dans ce worktree : **0 erreur [Vérifié]**. Build `next build` OK à 14 h 26 **[Déclaré]**.

**En cours au moment de la coupure** : correction de polices (Syne variable via `next/font`), contrôle visuel des captures
(les précédentes provenaient d'un serveur périmé dont le CSS renvoyait 500). Dernier serveur : `next start -p 3917` (arrêté depuis).

**Attention** : `src/proxy.ts` est modifié (matcher : ajout de `rundinova-preview`). L'agent l'a déclaré **temporaire, à
annuler avant commit**. Ce fichier appartient à la Fondation : ne pas le commiter depuis ce worktree.

**Reste** : captures 1440×900 et 390×844 sans erreur console, annulation du patch `proxy.ts`, commit, rapport.
Le kirundi et le swahili doivent être relus par un locuteur natif.

### 6.4 Infrastructure (fichiers seulement, rien sur le serveur) — `agent-a34a8658d1eb2f743`
**Périmètre** : `deploy/**`, `scripts/ops/**`, `docs/ops.md`, `.github/workflows/**`, `Dockerfile`, variables infra de `.env.example`.
A reçu en cours de route **l'annulation de Cloudflare** (SendMessage de 12 h 16 UTC) et s'est recalé sur `096de34`.

**Fait [Vérifié dans les fichiers]** :
- `scripts/ops/` : `lib.sh`, `backup.sh` (pg_dump + uploads, rotation 14 j, copie hors serveur si `RCLONE_REMOTE`),
  `restore.sh`, `selftest-backup-restore.sh`, `migrate.mjs`, `deploy.sh`, `health.sh`, `cert-provision.sh`,
  `cert-deploy-hook.sh`, `nginx-safe-apply.sh`, `selftest-nginx.sh`.
- `deploy/nginx/` : `conf.d/rundinova-studio.conf`, `sites-available/zz-rundinova-studio-http.conf`,
  `sites-available/zz-rundinova-studio-https.conf`, `snippets/rundinova-studio-cache.conf`.
- Sauvegarde/restauration testées localement : **« validated (10/10) » [Déclaré]**.

**Problème en cours** : `scripts/ops/selftest-nginx.sh` (test local nginx 1.24 + safe-apply + chaîne de certificats
dans un conteneur `ubuntu:24.04` jetable) **échoue** : `apt-get` ne peut ni résoudre ni télécharger les paquets
(« Temporary failure resolving archive.ubuntu.com », 404 debian-security) lors de la construction de l'image locale
`rs-selftest-nginx:noble`. Un passage précédent avait atteint « imitation du VPS : 3 vhosts existants servis » puis
s'était arrêté sur une autre erreur (exit 1). Cause probable : réseau/DNS du démon Docker local **[Inconnu, non diagnostiqué]**.

**Pas fait [Vérifié par absence]** : `deploy/compose.production.yml`, `deploy/compose.staging.yml`, `deploy/staging.sh`
(up/down/status), unités systemd `rundinova-studio-certs` (service + timer), `deploy/cron/rundinova-studio`,
`deploy/nginx/APPLY.md`, `docs/ops.md` (incluant « Passer plus tard à Cloudflare (non implémenté) »), refonte de la CI
(`.github/workflows/`), adaptation du `Dockerfile` (`DATABASE_URL`, volume `/data/uploads`), commit, rapport.

---

## 7. Décisions techniques à respecter

| Date | Décision | Par | Source |
| --- | --- | --- | --- |
| 22/11 | Nom technique `rundinova-studio` (≠ `rundinova-production`, l'ERPNext existant, sans rapport) | Claude | progress.md |
| 22/11 | PostgreSQL 16 **dédié** en conteneur (pas le PostgreSQL partagé de l'hôte, pas de base gérée) | Claude | progress.md |
| 22/11 | Une seule app Next.js multi-locataire, vendeur résolu par sous-domaine | Claude | progress.md |
| 22/11 | Drizzle ORM, auth maison scrypt, `forTenant()` obligatoire, `tenant_id NOT NULL` partout | Claude | plan.md §2 |
| 22/11 | **D1** : vitrine Studio sur **isoko.rundinova.com** ; `rundinova.com`/`www` = site officiel, **jamais routé** vers la plateforme | Propriétaire | plan.md §7 |
| 22/11 | **D2 révisée** : **aucun changement DNS**, rien via Cloudflare ; HTTPS Let's Encrypt HTTP-01 par hôte, certificat chargé dynamiquement, sans rechargement nginx ; plafond 20 émissions/semaine (limite LE de 50/semaine partagée par tout `rundinova.com`) ; pas de CDN, cache nginx dédié `rundinova_studio` (≤ 2 Go) + `immutable` | Propriétaire | plan.md §2 bis |
| 22/11 | **D3** : sauvegarde hors serveur **Cloudflare R2** (sans lien avec le DNS) | Propriétaire | plan.md §7 |
| 22/11 | Préproduction **arrêtée par défaut**, relancée en une commande | Propriétaire | progress.md |
| 22/11 | Super-admin : réinitialisation du mot de passe vendeur + identifiants envoyés par **lien WhatsApp pré-rempli** ; mot de passe provisoire à changer à la 1re connexion (`must_change_password`) | Propriétaire (+ détail Claude) | progress.md, transcription |
| 22/11 | Rapport final : 5 conteneurs les plus gourmands + recommandation de sauvegarde des autres projets (observation seulement) + passage éventuel à Cloudflare (explication seulement) | Propriétaire | plan.md §8 |
| 22/11 | Limites : app 640 Mo, `NODE_OPTIONS=--max-old-space-size=384`, db 256 Mo, staging 512 Mo | Claude | plan.md §2 |
| 22/11 | Krumbz garde ses URLs **exactes** et son rendu **identique** (preuve : parité 28/28) | Propriétaire | demande |
| 22/11 | CI : job rapide « verify » (typecheck, lint, contenu, build, Playwright smoke bureau ~3 min) bloquant ; suite complète la nuit/à la demande, non bloquante | **Claude, à confirmer** | consigne de l'agent Infra |

Attention aux **consignes périmées** dans les transcriptions : l'agent Infra et l'agent Fondation avaient d'abord reçu
« Cloudflare devant le VPS ». C'est **annulé** par la décision D2 révisée. Le fichier `docs/plan.md` actuel fait foi.

---

## 8. Problèmes, erreurs et risques connus

| # | Problème | Statut |
| --- | --- | --- |
| P1 | `selftest-nginx.sh` échoue : pas de réseau/DNS pendant `apt-get` dans le conteneur de test | Ouvert, à diagnostiquer (§6.4) |
| P2 | `src/proxy.ts` modifié à la fois par la Fondation (réécriture) et par le site Rundinova (matcher temporaire) | Conflit prévisible : garder la version Fondation |
| P3 | La Fondation fait de `localhost` nu le **marketing** : les routes de prévisualisation `(dev)/rundinova-preview` et `(dev)/demo-vitrine` seront interceptées par le proxy après fusion | À traiter à l'intégration (exclusion dans le matcher, ou rendu via `?tenant=`) |
| P4 | `.env.example` créé par la Fondation ; l'Infra doit y ajouter ses variables | Conflit prévisible, fusion manuelle |
| P5 | Doublon de migration : `scripts/db-migrate.mts` (Fondation) et `scripts/ops/migrate.mjs` (Infra) | À unifier |
| P6 | `package-lock.json` de la Fondation : +15 819 / −7 111 lignes | À vérifier avant commit |
| P7 | Accueil Krumbz : Lighthouse perf 64, LCP 3,4 s (objectif < 2,5 s) | Connu, non traité |
| P8 | Les 28 images de parité ne sont pas dans Git (`/reports/` ignoré) | Ne pas perdre ce dossier |
| P9 | `tsconfig.json` inclut `**/*.ts` sans exclure `.claude/` : un `tsc` lancé à la racine analyse aussi les worktrees | Aujourd'hui 0 erreur à la racine, mais sensible aux worktrees en cours |
| P10 | `tsc` dans les worktrees Template et Infra : erreurs `PageProps` uniquement, faute de `next typegen` | Sans gravité, lancer `npx next typegen` |
| P11 | Déploiement actuel lent (~19 min) à cause de la suite Playwright complète dans `deploy.yml` | Refonte CI prévue (Infra), non faite |
| P12 | `.gitignore` : `/images-a-integrer/` ne correspond pas au dossier `images-a-integre/` | Cosmétique, à signaler au propriétaire |
| P13 | Le VPS est sous pression mémoire (4,2 Go disponibles, swap 4 Go plein, 66 conteneurs d'autres projets) | Limites mémoire strictes obligatoires |

Vérifications relancées par OpenCode sur `main` (lecture seule) **[Vérifié]** : `tsc --noEmit` 0 erreur ;
`eslint` exit 0 ; `content:check` « Aucune erreur ». Pas de build ni de Playwright relancés par OpenCode.

---

## 9. Processus et services actifs (observés à 14 h 37, non modifiés)

| Élément | Détail | Origine |
| --- | --- | --- |
| Claude Code | pid **1498171** (et 1497889), extension VS Code, `--resume=04a11ba5-…`, en attente de la limite | Session principale |
| `rs-dev-db` | Conteneur `postgres:16-alpine`, `127.0.0.1:55432`, 256 Mo, créé à 14 h 04 par l'agent Fondation, base `rundinova_studio` migrée et amorcée | **Données de dev jetables, à conserver** jusqu'à la fin de la Fondation |
| `next dev -p 3000` | pid 196638/196657 (depuis le 19/11), dépôt principal, répond 200 | Session antérieure [origine exacte inconnue] |
| `next start -p 3200` | pid 923256/923257 (depuis le 20/11), dépôt principal, répond 200 ; build probablement périmé (`.next` reconstruit le 22/11 à 13 h 39) | Session antérieure [inconnue] |
| Ports 3310 / 3320 / 3917 | Serveurs de référence / Fondation / Rundinova : **arrêtés** | Agents |
| Autres conteneurs (rundinova-* ERPNext, medicore-postgres, koraneza-mvp-db-1…) et PostgreSQL 15 de l'hôte | **Autres projets, ne jamais toucher** | — |
| Image Docker locale `ubuntu:24.04` (tirée par l'agent Infra), image `rs-selftest-nginx:noble` peut-être partielle | Test nginx local | Agent Infra |

Fichiers temporaires des agents : `/tmp/claude-1000/-home-jubuniyoko-development-js-ViteJs-krumbz-website/04a11ba5-ee4b-4a9d-a941-6f69fc2efbff/scratchpad/`
(journaux, captures, `probe.sh`, `fontcheck.mjs`, modèle source dans `dl/`). Ils seront perdus au redémarrage de la machine.

---

## 10. Commandes utiles

```bash
# Dépôt principal (Krumbz actuel)
npm run dev                        # http://localhost:3000 (déjà occupé par un next dev existant)
npm run build && npm run start     # production locale
npm run typecheck                  # next typegen && tsc --noEmit
npm run lint
npm run content:check              # cohérence des 4 langues
npm run test:e2e                   # Playwright bureau + mobile, après build (PW_BASE_URL pour cibler un port)
npm run budgets                    # page initiale < 1,5 Mo, 3D ≤ 3 Mo
npm run lighthouse                 # serveur sur :3000
npm run todo                       # éléments « À COMPLÉTER » / images manquantes

# Parité visuelle (comparer à la référence, sans --update-snapshots !)
PARITY_DIR=/home/jubuniyoko/development/js/ViteJs/krumbz-website/reports/parity \
PW_BASE_URL=http://localhost:3320 npx playwright test -c playwright.parity.config.ts

# Worktree Fondation (agent-a83dbf0482966955e) — base locale rs-dev-db déjà migrée et amorcée
npm run db:generate                # drizzle-kit generate (après modification du schéma)
npm run db:migrate                 # applique drizzle/ sur DATABASE_URL (.env.local)
npm run db:seed:krumbz             # idempotent
npm run test:isolation             # node --test tests/isolation/*.test.mts
npx next typegen && npx tsc --noEmit && npx eslint
npx next build && npx next start -p 3320
# hôte en dev : http://krumbz.localhost:3320/  ou  http://localhost:3320/?tenant=krumbz

# Mise en place d'un nouveau worktree (si nécessaire)
cp -al /home/jubuniyoko/development/js/ViteJs/krumbz-website/node_modules node_modules
node scripts/copy-vendor.mjs

# Infra (worktree agent-a34a8658d1eb2f743), localement uniquement
scripts/ops/selftest-backup-restore.sh
scripts/ops/selftest-nginx.sh      # échoue actuellement (P1)
```

### Variables d'environnement (noms seulement)
- App : `DATABASE_URL`, `DATABASE_POOL_MAX`, `PLATFORM_ROOT_DOMAIN`, `TRUST_FORWARDED_HOST` (1 seulement derrière le nginx du VPS),
  `NEXT_PUBLIC_SITE_URL`, `CERT_REQUESTS_DIR`, `CERT_STATUS_DIR`, `NEXT_OUTPUT_STANDALONE`, `PORT`.
- Tests : `PW_BASE_URL`, `PARITY_DIR`, `CHROME_PATH`, `CI`.
- Sauvegardes : `RCLONE_REMOTE`, `RETENTION_DAYS`.
- Secrets GitHub (CI actuelle) : `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `GITHUB_TOKEN` ; variable de dépôt prévue : `STUDIO_DEPLOY_ENABLED`.
- Les valeurs réelles sont dans `.env.local` (worktree Fondation, git-ignoré) et, sur le serveur, dans `/opt/rundinova-studio/.env` (600). **Ne jamais les recopier.**

---

## 11. Tâches restantes (ordonnées)

| # | Prio | Tâche | État | Fichiers / composants | Dépend de | Terminé quand |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | P0 | Vérifier que rien n'a bougé depuis ce document (OpenCode a pu travailler entre-temps) | à faire | §14 | — | Écarts identifiés et compris |
| T2 | P0 | **Finir la Fondation** : fix `robots.ts` (https), suite Playwright existante sur le build, contrôle `package-lock.json`, commit(s), rapport | 90 % | worktree `agent-a83dbf…` | T1 | tsc + eslint + build OK ; isolation 14/14 ; parité 28/28 ; suite Playwright existante verte ; commit sur la branche |
| T3 | P0 | Reprendre l'agent **Template vitrine** : point d'entrée `VitrineStorefront`, pages, `demo/shoes.ts`, route `(dev)/demo-vitrine`, crédit CC BY 4.0, captures, commit | ~45 % | worktree `agent-acf0da…` | — (parallèle à T2) | Captures bureau/mobile sans erreur console ; budget < 1,5 Mo avant 3D ; commit |
| T4 | P1 | Reprendre l'agent **Site Rundinova** : captures finales, annuler le patch `proxy.ts`, commit | ~85 % | worktree `agent-a7b732…` | — | Captures 1440×900 + 390×844 sans erreur ; `proxy.ts` non modifié ; commit |
| T5 | P1 | Reprendre l'agent **Infra** : corriger P1, créer compose prod/staging + `staging.sh`, systemd certs, cron, `APPLY.md`, `docs/ops.md` sans Cloudflare, CI rapide, `Dockerfile` | ~40 % | worktree `agent-a34a86…` | — | `docker compose config` OK ; selftests backup et nginx verts ; shellcheck propre ; commit |
| T6 | P1 | **Intégrer les 4 branches dans `main`** (ordre conseillé : Fondation → Template → Rundinova → Infra), résoudre P2–P5, brancher `RundinovaHome` dans `src/app/marketing/[locale]/page.tsx` et `VitrineStorefront` dans `src/app/tpl/vitrine/[tenant]/[locale]/`, amorcer la boutique démo en base | à faire | `src/proxy.ts`, `.env.example`, `src/app/**` | T2–T5 | Build + lint + tsc + parité 28/28 + suite Playwright verts sur `main` ; `docs/progress.md` mis à jour ; 1 commit par étape |
| T7 | P1 | Étape 3 — **Espace vendeur** (FR + RN, mobile d'abord) : connexion, produits (ajout/modif/masquer), prix, promos, photos (sharp → WebP/AVIF), WhatsApp/contacts | non commencé | `src/app/espace/**`, `forTenant()` | T6 | Tests d'isolation + Playwright mobile/bureau ; aucun accès au design/3D |
| T8 | P1 | Étape 4 — **Super-admin** : création guidée de vendeur + demande de certificat, thèmes, textes, scènes, produits 3D, QR code HD (PNG 4096 + SVG), fonctionnalités, abonnements, paiements manuels, pause automatique, réinitialisation mot de passe + lien WhatsApp, santé, réglages de l'offre | non commencé | `src/app/admin/**`, `certs.ts`, `users.ts` | T6 | Créer un vendeur de bout en bout en local ; tests |
| T9 | P2 | Étape 7 — **Statistiques** anonymes (visites, vues produit, clics WhatsApp ; ni IP ni cookie) + endpoint `GET /api/health/shops` | non commencé | `stats_daily`, routes API | T6–T8 | Compteurs visibles côté vendeur et admin ; aucune donnée personnelle |
| T10 | P2 | Étape 9 — **Préproduction** sur le VPS (staging arrêtable), recette complète, Lighthouse par boutique | non commencé | `deploy/` | T5, T6 ; **accord pour la 1re modification nginx** | Tous les parcours validés en staging ; tous les sites du VPS répondent |
| T11 | P3 | Étape 10 — **Bascule** Krumbz (proxy_pass 19200 → 19300) avec sauvegarde complète préalable | non commencé | nginx du VPS | T10 + **accord** | Krumbz identique, aucune coupure, tous les sites du VPS OK |
| T12 | P3 | Étape 11 — README (créer un vendeur, restaurer, déployer) + `docs/rapport-final.md` (contenu exigé : plan.md §8) | non commencé | `README.md`, `docs/` | T11 | Documents relus |
| T13 | P3 | Performance de l'accueil Krumbz (LCP 3,4 s) | proposé, non lancé | `src/components/sections/home/**` | Ne pas casser la parité | LCP mobile < 2,5 s, parité maintenue |

---

## 12. Instructions pour le prochain Claude Code

### Où reprendre
1. Lis ce fichier, puis `docs/progress.md` et `docs/plan.md` (ils font foi pour les décisions).
2. Fais T1 : compare l'état réel avec la §14.
3. **Si tu es dans la même session Claude Code (`04a11ba5-ee4b-4a9d-a941-6f69fc2efbff`)**, relance les agents existants
   par **SendMessage**, en commençant par la Fondation (`a83dbf0482966955e`), puis `acf0da094577cf6c6` (Template),
   `a7b73284bd5c699cf` (Rundinova) et `a34a8658d1eb2f743` (Infra). Rappelle à chacun l'état résumé en §6 et la décision D2
   révisée (sans Cloudflare).
4. **Si la session est nouvelle** et que ces identifiants ne répondent plus : crée de nouveaux agents qui **travaillent dans
   les worktrees existants** (même chemin, même branche), avec la consigne de reprendre et non de recommencer.

### Prochaine action concrète
Dans `.claude/worktrees/agent-a83dbf0482966955e` :
1. Corriger le protocole du sitemap dans `src/app/robots.ts` (`https` hors local).
2. `npx next build`, `npx next start -p 3320`, puis `PW_BASE_URL=http://localhost:3320 npx playwright test` (suite existante),
   et corriger les régressions. Relancer la parité une fois si `proxy.ts` ou les pages ont bougé.
3. Vérifier le diff de `package-lock.json`.
4. Commiter en français, avec la ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, sans `node_modules`,
   `.env.local`, `public/vendor`, `public/basis`.
5. Mettre à jour `docs/progress.md` (étapes 1 et 2), puis lancer l'intégration (T6) quand les autres branches sont prêtes.

### À ne surtout pas recommencer
- L'audit du VPS, `docs/plan.md`, les décisions D1–D3 : faits.
- La référence de parité `reports/parity/` (28 images) : **ne jamais lancer `--update-snapshots`**, sinon la preuve
  « avant/après » est perdue.
- Le schéma Drizzle, la migration `0000_init.sql`, le seed Krumbz, le routage par hôte, les tests d'isolation : faits et verts.
- Le téléchargement et l'optimisation du modèle de chaussure (`public/demo/models/ikirenge-sneaker.glb`).
- Le module `src/marketing/` et les textes `content/rundinova/*.json`.
- Les scripts de sauvegarde et de restauration (testés 10/10).
- Ne recrée pas de worktree ni de conteneur `rs-dev-db` : ils existent.

### Règles à respecter
- Ne rien modifier, arrêter ou redémarrer sur le VPS qui ne concerne pas Rundinova/Krumbz. Aucune connexion au serveur
  sans nécessité. Toute modification partagée (nginx, Docker global, pare-feu, DNS) : **accord préalable**, sauvegarde,
  `nginx -t`, vérification de **tous** les sites, retour arrière.
- `krumbz.rundinova.com` doit rester en ligne et identique jusqu'à la bascule.
- Aucun secret dans le code, les commits ou les rapports.
- Ne pas modifier `src/lib/tenant/types.ts` unilatéralement (contrat partagé, « change through the lead »).
- Next 16 : `src/proxy.ts` (pas `middleware.ts`) ; lire `node_modules/next/dist/docs/` avant d'utiliser une API.
- Ne pas pousser `main` sans accord : cela redéploie la production (§5.1).
- Ne pas supprimer `images-a-integre/`, `images-en-attente/`, `references/`, `reports/`.

### À résoudre avant de poursuivre au-delà de l'intégration
- P1 (test nginx local), P2–P5 (conflits de fusion), P3 (routes de prévisualisation interceptées par le proxy).

---

## 13. Validation requise du propriétaire

1. **D4 (en attente)** : numéro WhatsApp Rundinova (formulaire « Je veux ma vitrine »), numéros Lumicash / EcoCash pour
   les abonnements, photos réelles pour la boutique démo chaussures. Valeurs provisoires signalées en attendant.
2. **CI** : confirmer le passage à un job rapide bloquant (~3 min) avec la suite complète en non bloquant
   (proposé par Claude le 21/11 avec 3 options, sans réponse explicite trouvée).
3. **Première modification nginx du VPS** (bloc serveur, zone de cache, webroot ACME, unités systemd) : accord explicite requis.
4. **Bascule de Krumbz** vers la plateforme : accord explicite requis.
5. **Pousser les commits** sur `origin/main` (déclenche un redéploiement de Krumbz).
6. Relecture des textes **kirundi et swahili** (Krumbz, Rundinova, démo) par des locuteurs natifs.
7. Crédit **CC BY 4.0** du modèle de chaussure Shopify/Khronos sur la boutique démo : accepter, ou fournir un modèle propre.
8. Coûts : création du bucket Cloudflare R2 (gratuit jusqu'à 10 Go, carte bancaire demandée) et du jeton d'API à portée limitée.
9. Le chantier performance de l'accueil Krumbz (T13) est-il prioritaire ?

---

## 14. Instantané de référence (pour détecter les changements faits après ce document)

```
main                               HEAD 096de34, propre, non suivis : .vscode/, images-a-integre/
origin/main                        26cff63
worktree-agent-a83dbf0482966955e   HEAD ac57629 ; 27 entrées suivies modifiées/renommées ; non commité ; locked
worktree-agent-acf0da094577cf6c6   HEAD d928c78 ; 0 modif suivie ; non suivis : public/demo/, scripts/optimize-gltf.mjs, src/templates/
worktree-agent-a7b73284bd5c699cf   HEAD d928c78 ; src/proxy.ts modifié (+1/−1) ; non suivis : content/rundinova/, src/app/(dev)/, src/marketing/ ; locked
worktree-agent-a34a8658d1eb2f743   HEAD 096de34 ; 0 modif suivie ; non suivis : deploy/, scripts/ops/
Dernières écritures des agents     14:26–14:30 CAT le 22/11
Conteneur rs-dev-db                actif, 127.0.0.1:55432
```

Commande de contrôle rapide :
```bash
git status --short && git log --oneline -5 && git worktree list
for w in .claude/worktrees/*; do echo "== $w"; git -C "$w" status --short | head -40; git -C "$w" log --oneline -1; done
```

---

*Pour cette passation, OpenCode n'a modifié aucun fichier applicatif, n'a fait aucun commit, reset ni checkout, n'a lancé
aucune migration et n'a arrêté aucun processus. Seul ce fichier `CLAUDE_HANDOFF.md` a été créé.*


## État d'intégration (2026-11-22, validation complète + Amtips)

- **Branche** : `rundinova-studio` (worktree `.claude/worktrees/integration`), propre.
- **HEAD** : `59782db` (sur `8699182` validation précédente).
- **Commits clés récents** : `4064e19` fusion espace, `407a89a` fusion admin, `28a96a1` docs, `0f1bc68` délais screenshots mobile, `969abd0`/`8699182` docs validation, `59782db` Amtips/WhatsApp/Lumicash.
- **D4/Amtips intégré** :
  - WhatsApp Rundinova : `25767309309` (confirmé propriétaire).
  - Lumicash : nom `Niyondiko Joffre` (confirmé) ; numéro renseigné `25767309309` **(à confirmer si différent)**.
  - EcoCash : placeholder conservé (en attente).
  - Paiement Amtips : lien `https://amtips.app/t/1645db99-16f5-4d53-b20f-074a0ab0c207?campaign=2e1f738f-61a2-48bb-a19b-ec12cac67b99`, QR `public/images/payment/amtips-qr.png` (copie de `~/Downloads/qrcode.png`, 24623 octets) affiché dans réglages admin et section contact marketing Isoko.
  - Photos démo : placeholders conservés (propriétaire fournira plus tard).
- **Décision cache validée** : **Option A** — uploads versionnés/uniques + `Cache-Control: public, max-age=31536000, immutable` ; assets démo statiques remplacés par nom versionné + immutable, sinon `max-age` court/stale-while-revalidate.
- **Contrôles verts (post-Amtips)** :
  - `npx next typegen` OK
  - `npx tsc --noEmit` OK
  - `npm run -s lint` OK (2 warnings `@next/next/no-img-element` sur QR statique, non bloquants)
  - `npm run -s test:isolation` : **32/32**
  - `npx next build` OK (104 pages statiques ; avertissements Turbopack connus `certs.ts`/`uploads/images.ts`/`health.ts`)
  - `tests/admin.spec.ts` desktop+mobile (`PW_TENANT=admin`, `PW_BASE_URL=http://localhost:3362`) : **10/10**
  - Smoke HTTP Isoko `/fr /en` (Host header) : 200, contient `amtips`, `25767309309`, `/images/payment/amtips-qr.png`.
- **Validation complète précédente (toujours valide, code non régressé hors D4/UI)** : Playwright général Krumbz 163 pass + 1 flake `scene-framing/famille-maison` repassée seule + screenshots mobile 24/24 après correctif ; espace e2e 2/2 ; parité 28/28 ; smoke Krumbz/Isoko/Ikirenge/admin/espace OK.
- **Aucune action interdite** : pas de push, pas de merge dans `main`, pas de déploiement/DNS/VPS.
