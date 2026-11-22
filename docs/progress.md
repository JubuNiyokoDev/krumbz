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

## En cours (sous-agents, branches de worktree)
- Validation complète effectuée sur `rundinova-studio`. Avant push `main`/déploiement : obtenir accord explicite, puis relancer CI/contrôles si la branche bouge. Décisions D4 et cache `/models`/`/images` restent en attente.

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

## Décisions en attente
- D4 informations métier (WhatsApp Rundinova, numéros Lumicash/EcoCash, photos démo) : valeurs provisoires en attendant.
