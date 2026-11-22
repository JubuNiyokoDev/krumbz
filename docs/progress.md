# Suivi — Rundinova Studio

> Mis à jour après chaque étape. En cas d'interruption, reprendre à partir de « En cours ».
> Plan et architecture : [`plan.md`](plan.md).

## Fait
- 2026-11-22 — Audit du VPS en lecture seule (voir plan §1). Aucune modification sur le serveur.
- 2026-11-22 — Plan et architecture rédigés (`docs/plan.md`).

- 2026-11-22 — Étape 0 : référence visuelle Krumbz (28 captures, stable sur 2 passes), `playwright.parity.config.ts`.
- 2026-11-22 — Contrat partagé `src/lib/tenant/types.ts`.

## Fait (suite)

- 2026-11-22 — Super-admin commité (`f454797`, `studio-admin`) : boutiques, comptes, paiements, réglages, stats, santé, journal, QR, cron/billing:expire ; isolation 26/26, e2e 10/10.
- 2026-11-22 — Intégration `rundinova-studio` : fusion `studio-espace` (`4064e19`) + `studio-admin` (`407a89a`), conflits `package.json` résolus, `npm install`. Contrôles verts : typegen/tsc/eslint/build, isolation 32/32.
- 2026-11-22 — Validation complète intégration : Playwright général 163 pass + 1 flake `scene-framing/famille-maison` repassée seule + 8 timeouts `screenshots.spec` mobile corrigés (`0f1bc68`) puis 24/24 ; admin e2e 10/10 ; espace e2e 2/2 ; parité 28/28 (`PARITY_DIR` racine reports/parity) ; smoke HTTP Krumbz/Isoko/Ikirenge/admin/espace OK (wa.me présents).
- 2026-11-22 — Intégration Amtips/D4 partielle (`59782db`) : WhatsApp Rundinova `25767309309` confirmé, Lumicash `Niyondiko Joffre` confirmé (numéro `25767309309` supposé, à confirmer), lien Amtips + QR `public/images/payment/amtips-qr.png` intégrés dans réglages admin et contact Isoko ; EcoCash/photos démo restent placeholders. Contrôles post-modif : typegen/tsc/lint OK, build OK, isolation 32/32, admin e2e 10/10, smoke Isoko /fr /en Amtips+WhatsApp+QR OK.
- 2026-11-22 — Revalidation finale HEAD `1a79f17` : espace e2e 2/2, parité 28/28, suite générale Krumbz 172/172 (4 screenshots mobile home flaky sous charge, repassés seuls OK), admin 10/10, isolation 32/32, build/lint/tsc/typegen OK. Aucun push/merge/déploiement.

## En cours
- Intégration terminée et validée sur `rundinova-studio` (HEAD `59782db`). En attente de validation propriétaire puis accord explicite pour fusion/push `main` et/ou déploiement.

## Reste à faire
Étapes 1 à 11 du plan.

## Décisions prises
| Date | Décision | Par |
| --- | --- | --- |
| 2026-11-22 | Nom technique de la plateforme : `rundinova-studio` (distinct de `rundinova-production`, l'ERPNext existant) | Claude |
| 2026-11-22 | PostgreSQL 16 dédié en conteneur (pas le PostgreSQL partagé de l'hôte, pas de base gérée externe) | Claude |
| 2026-11-22 | Une seule application Next.js multi-locataire, vendeur résolu par sous-domaine | Claude |

| 2026-11-22 | Vitrine Studio sur isoko.rundinova.com, rundinova.com intact | Propriétaire |
| 2026-11-22 | ~~DNS chez Cloudflare~~ **annulé** : DNS InterServer inchangé, HTTPS Let's Encrypt HTTP-01 par hôte avec certificat chargé dynamiquement (sans rechargement nginx), pas de CDN (cache nginx dédié + `immutable`) | Propriétaire |
| 2026-11-22 | Sauvegarde hors serveur : Cloudflare R2 (maintenu, sans lien avec le DNS) | Propriétaire |
| 2026-11-22 | Préproduction arrêtée par défaut, relancée en une commande | Propriétaire |
| 2026-11-22 | Super-admin : réinitialisation mot de passe vendeur + identifiants envoyés par lien WhatsApp | Propriétaire |
| 2026-11-22 | Rapport final : 5 conteneurs les plus gourmands + recommandation de sauvegarde des autres projets (observation seulement) | Propriétaire |
| 2026-11-22 | Cache `/models` et `/images` : **Option A** validée — uploads versionnés/uniques + `immutable`; assets démo statiques remplacés par nom versionné + `immutable`, sinon `max-age` court/stale-while-revalidate | Propriétaire |
| 2026-11-22 | D4 partiel : WhatsApp Rundinova `25767309309`, Lumicash `Niyondiko Joffre` confirmés ; paiement via Amtips lien+QR intégré ; EcoCash/photos démo en attente | Propriétaire |

## Décisions en attente
- Confirmer numéro Lumicash exact (hypothèse `25767309309` appliquée) ; fournir numéro+nom EcoCash ; fournir photos démo réelles.
- Confirmer que le QR Amtips retenu est `~/Downloads/qrcode.png` (le plus grand des 5 fichiers qrcode téléchargés).
- Accord explicite propriétaire pour fusionner `rundinova-studio` dans `main` (puis push/déploiement/DNS/VPS seulement après accord séparé).

## Vérification de reprise (Claude, 2026-11-22)
- Branche `rundinova-studio` (intégration OpenCode, 24 commits) relue : TypeScript 0 erreur, lint 0 erreur ;
  sécurité contrôlée (scrypt, cookie HttpOnly/SameSite, limitation des tentatives, téléversements bornés,
  toutes les actions admin via `requireSuperadmin`, toutes les actions vendeur via `vendorContext` → tenant pris dans la session).
- **Corrigé (c9d70b6)** : `deploy.yml` redéployait l'ancien conteneur `krumbz` (sans base de données) à chaque push sur main
  → krumbz.rundinova.com serait tombé. Ce job est désormais manuel (retour arrière uniquement).
- Règle : **ne pas pousser `main` avant la bascule** ; la préproduction passe par la branche `staging`.

## Préproduction (accords du 2026-11-22)
- Image `rundinova-studio:staging-sha-8431c8d` construite par la CI (branche `staging`, déploiement auto désactivé).
- VPS : `/opt/rundinova-studio-staging` (`.env` 600, secrets générés sur le serveur), DB 160 Mo + app 512 Mo démarrées
  (`./staging.sh up|down|status`) ; base initialisée par tunnel SSH (Krumbz, démo Ikirenge, super-admin).
  Accès recette (htpasswd) : `/root/rundinova-studio-staging-acces.txt` sur le VPS ; mot de passe super-admin provisoire :
  `~/.rundinova-staging-superadmin.txt` sur le poste du propriétaire.
- nginx : `conf.d/rundinova-studio.conf` + 2 vhosts **staging seulement** (5 noms explicites, sans joker) via `nginx-safe-apply.sh` :
  115 sondes OK, aucun site dégradé ; 20 avertissements « protocol options redefined » identiques avant/après (préexistants) ;
  sauvegarde `/root/nginx-backups/nginx-20261122-163604.tar.gz`.
- Certificats Let's Encrypt émis pour les 5 hôtes staging (expiration 2027-02-20) ; minuterie `rundinova-studio-certs.timer` active
  (corrigé c5c1ebe : chemins de production facultatifs, sinon 226/NAMESPACE). Compte Let's Encrypt sans e-mail (pas d'accord pour l'envoyer).
- Super-admin : **rundinovatech@gmail.com** (compte rundinova@kit-hub.com désactivé).
- Vérification HTTPS (avec l'accès recette) : krumbz `/`, `/produits`, `/en/products`, `/commander`, ikirenge, isoko, admin, espace → 200.

## Reste à faire
1. Recette du propriétaire sur https://staging-*.rundinova.com, puis `./staging.sh down` (préproduction arrêtée quand elle ne sert pas).
2. Production : stack `rundinova-studio` (19300), vhosts isoko/admin/espace + joker (accord), bascule Krumbz 19200 → 19300 (accord), sauvegardes R2 (bucket + jeton à créer par le propriétaire), surveillance.
3. README + `docs/rapport-final.md`.
