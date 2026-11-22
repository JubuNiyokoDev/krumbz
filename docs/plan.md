# Rundinova Studio — architecture et plan

> Transformation du projet Krumbz en plateforme multi-vendeurs (vitrines immersives, commandes WhatsApp).
> Document de référence. Le suivi d'exécution est dans [`progress.md`](progress.md).

## 1. Audit du VPS (22 novembre 2026, lecture seule)

| Élément | Constat | Conséquence |
| --- | --- | --- |
| Machine | Ubuntu 24.04, 4 vCPU, 15,6 Go RAM, disque 193 Go (50 Go libres) | OK |
| Mémoire | 11 Go utilisés, **4,2 Go disponibles**, **swap 4 Go plein**, charge ≈ 2,7 | Marge réelle ≈ 3 Go : limites mémoire strictes obligatoires |
| Docker | 29.5, Compose v5, **66 conteneurs actifs** (≈ 15 projets) ; seuls 3 ont des limites mémoire | Ne jamais toucher aux autres stacks |
| Krumbz actuel | conteneur `krumbz` (Next standalone), **728 Mo** sans limite, `127.0.0.1:19200`, `/opt/krumbz` | Plafonner le tas Node (≈ 400 Mo suffisent) |
| nginx | 1.24, 43 sites, **aucun `default_server`, aucun `server_name *.rundinova.com`** | Un bloc joker est possible sans conflit : les noms exacts gardent la priorité |
| Certificats | certbot HTTP-01, un certificat par sous-domaine | Un certificat joker exige DNS-01 (ou Cloudflare) |
| DNS | NS **InterServer** (pas Cloudflare) ; un enregistrement joker `*.rundinova.com → 31.97.33.141` existe déjà | HTTPS joker impossible tel quel |
| `rundinova.com` | sert le site statique **« RundiNova Tech – L'Innovation au Cœur de l'Afrique »** (`/var/www/rundinova.tech/html`) | La vitrine Rundinova à cette adresse **remplacerait ce site** → décision |
| Sous-domaines pris | koraneza, demo.koraneza, chat, livekit, livekit-admin, workspace, cdn, storage, s3, tableyawe, tableyawe-api, shopsync, games, realtime, central, krumbz, www | Liste réservée : aucun vendeur ne peut les prendre |
| `rundinova-production` | ERPNext (MariaDB, Redis) — **projet distinct** | Ne pas confondre : la plateforme s'appellera **`rundinova-studio`** |
| PostgreSQL | 16 sur l'hôte, partagé par ≈ 15 bases d'autres projets | Ne pas l'utiliser (service partagé) |
| Stockage | rustfs (S3) `rundinova-storage` → cdn/storage/s3.rundinova.com | Service partagé : non utilisé sans accord |
| Sauvegardes | aucune tâche de sauvegarde planifiée visible | À créer pour la plateforme |

**Verdict** : le VPS peut porter la plateforme (≈ 1,2 Go en production + ≈ 0,6 Go en préproduction, avec limites), à condition de plafonner la mémoire de chaque conteneur. Le swap plein indique déjà une pression mémoire sur le serveur, indépendante de Krumbz : à surveiller.

## 2. Choix techniques

| Sujet | Choix | Pourquoi |
| --- | --- | --- |
| Application | **Une seule app Next.js 16** (évolution du code Krumbz), multi-locataire par sous-domaine | Un seul build, un seul conteneur, Krumbz réutilisé tel quel |
| Résolution du vendeur | `src/proxy.ts` lit l'en-tête `Host` → réécriture interne vers `/s/[tenant]/[locale]/…` | Isolation par URL, pages statiques/ISR par vendeur |
| Base de données | **PostgreSQL 16 dédié en conteneur** (`rundinova-studio-db`, 256 Mo max) | Isolation totale, sauvegardes indépendantes, aucun impact sur le PostgreSQL partagé ; une base gérée gratuite (Neon/Supabase) ajouterait 50–150 ms de latence par requête et une dépendance externe |
| ORM | **Drizzle** (+ migrations SQL versionnées) | Léger (pas de moteur binaire), typé, adapté au faible budget mémoire |
| Authentification | Maison : mot de passe haché **scrypt** (node:crypto), sessions en base, cookie `HttpOnly; Secure; SameSite=Lax`, limitation des tentatives | Pas de dépendance lourde ; 2 rôles seulement (super-admin, vendeur) |
| Isolation des données | Toutes les requêtes vendeur passent par `withTenant(tenantId)` ; `tenant_id` obligatoire sur chaque table métier ; tests d'isolation automatiques | Exigence « isolation stricte » |
| Images | Upload → **sharp** (WebP + AVIF, 3 tailles, EXIF supprimé) → volume `/data/uploads/<tenant>/` → servies avec `Cache-Control: immutable` | Compression automatique, cache CDN |
| 3D | Krumbz garde son expérience sur mesure (template `krumbz`) ; nouveau template **`vitrine`** : glTF optimisé (gltf-transform, Meshopt) par produit phare, sinon présentation photo immersive (cartes en relief, carrousel en profondeur, parallaxe, lumière) | Exigence 4 |
| Fonctionnalités | Table `tenant_features` (3d, advancedAnimations, languages, stats) | Futures options payantes |
| Abonnements | `subscriptions` + `payments` (validation manuelle mobile money) ; tâche quotidienne : expiration → **« Boutique en pause »** | Exigence 3 |
| Statistiques | Compteurs agrégés par jour (visites, vues produit, clics WhatsApp) ; **ni IP, ni cookie, ni identifiant** visiteur | Exigence 6 (aucune donnée personnelle) |
| QR code | `qrcode` → PNG 4096 px + SVG vectoriel (impression chemise) | Exigence 3 |
| Conteneurs | `rundinova-studio` (app, 640 Mo / 1 CPU), `rundinova-studio-db` (256 Mo / 0,5 CPU), préproduction `rundinova-studio-staging` (512 Mo / 0,5 CPU) | Limites mémoire/CPU obligatoires |
| Sauvegardes | Quotidiennes : `pg_dump` + archive des uploads, rotation 14 jours locale ; copie hors serveur selon décision | Restauration testée et documentée |
| Surveillance | Script cron (mémoire, disque, disponibilité de chaque boutique) + page « Santé » en super-admin | Simple, sans service supplémentaire |

## 3. Hôtes (proposition, à valider)

| Hôte | Rôle |
| --- | --- |
| `<vendeur>.rundinova.com` | Boutique du vendeur (ex. `krumbz.rundinova.com`) |
| `isoko.rundinova.com` | Vitrine Rundinova Studio (D1) — **`rundinova.com` reste le site officiel, intact** |
| `admin.rundinova.com` | Super-administration |
| `espace.rundinova.com` | Espace vendeur (connexion unique pour tous les vendeurs) |
| `staging.rundinova.com`, `staging-<vendeur>.rundinova.com`, `staging-admin…`, `staging-espace…` | Préproduction (un seul niveau de sous-domaine → couvert par un certificat joker) |

## 4. Modèle de données (résumé)

`tenants` (slug, nom, statut, template, thème JSON, contenus par langue JSON, contacts, WhatsApp, réseaux, langues) ·
`tenant_features` · `products` (tenant_id, nom/description par langue, prix, promo, visible, ordre, modèle 3D) ·
`product_images` · `media` · `users` (rôle `superadmin` | `vendor`, tenant_id pour les vendeurs) · `sessions` · `login_attempts` ·
`subscriptions` · `payments` · `stats_daily` (tenant, jour, type, produit, compteur) · `settings` (offre : textes et prix) · `audit_log`.

## 5. Garde-fous de production

1. Aucune action sur ce qui n'est pas Rundinova Studio / Krumbz.
2. Toute modification partagée (nginx, DNS, pare-feu, Docker global) : **accord préalable**, sauvegarde, `nginx -t`, application, vérification immédiate de **tous** les sites du VPS, restauration en cas de problème.
3. `krumbz.rundinova.com` reste servi par le conteneur actuel jusqu'à la bascule ; la bascule = changer le `proxy_pass` d'un seul site (réversible en une commande).
4. Sauvegarde complète (image Docker actuelle étiquetée, `/opt/krumbz`, config nginx) avant la bascule.
5. Aucun secret dans le dépôt : `.env` sur le serveur (droits 600), secrets GitHub pour la CI.

## 6. Étapes

| # | Étape | Contenu | Dépend de |
| --- | --- | --- | --- |
| 0 | Référence | Captures Playwright « avant » de Krumbz (6 pages × 4 langues × bureau/mobile) | — |
| 1 | Fondation | Base (Drizzle, migrations), résolution du vendeur par `Host`, configuration vendeur, liste réservée, isolation | — |
| 2 | Migration Krumbz | Krumbz devient le vendeur n°1 (template `krumbz`) ; produits/prix/contacts depuis la base ; captures « après » = « avant » | 0, 1 |
| 3 | Espace vendeur | Connexion, produits (ajout/modif/masquer), prix, promos, photos, WhatsApp/contacts ; FR + RN ; mobile d'abord | 1 |
| 4 | Super-admin | Vendeurs (création guidée), thèmes, textes, scènes, produits phares 3D, QR code HD, fonctionnalités, abonnements, paiements, réglages de l'offre, santé | 1 |
| 5 | Template générique | Vitrine immersive à partir de photos + glTF optionnel ; boutique de démonstration chaussures | 1 |
| 6 | Vitrine Rundinova | Accueil immersif, galerie des boutiques, offre, formulaire WhatsApp ; FR/RN/EN/SW | 1, 5 |
| 7 | Statistiques | Compteurs anonymes + tableaux (vendeur, admin) | 1, 3, 4 |
| 8 | Infra | Compose `rundinova-studio` (+ staging), sauvegardes + restauration testée, surveillance, CI/CD | décisions D2–D4 |
| 9 | Préproduction | Déploiement staging, recette complète bureau/mobile, Lighthouse par boutique | 8 |
| 10 | Bascule | Sauvegarde, bascule Krumbz sans coupure, vérification de tous les sites du VPS | 9, accord |
| 11 | Livraison | README (créer un vendeur, restaurer, déployer), `docs/rapport-final.md` | 10 |

## 7. Décisions à prendre (propriétaire)

- **D1 — tranché** : vitrine sur **isoko.rundinova.com** ; rundinova.com intact.
- **D2 — tranché** : DNS migré chez **Cloudflare** (gratuit), action du propriétaire guidée par `docs/ops.md`.
- **D3 — tranché** : copie hors serveur sur **Cloudflare R2** (gratuit jusqu'à 10 Go).
- **D4 — reporté** : WhatsApp Rundinova, numéros mobile money, photos de démonstration → valeurs provisoires marquées.
