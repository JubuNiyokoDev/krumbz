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
