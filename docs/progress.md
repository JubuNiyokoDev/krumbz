# Suivi — Rundinova Studio

> Mis à jour après chaque étape. En cas d'interruption, reprendre à partir de « En cours ».
> Plan et architecture : [`plan.md`](plan.md).

## Fait
- 2026-11-22 — Audit du VPS en lecture seule (voir plan §1). Aucune modification sur le serveur.
- 2026-11-22 — Plan et architecture rédigés (`docs/plan.md`).

## En cours
- Étape 0 : captures de référence « avant » de Krumbz.
- En attente de décisions D1–D4 (voir plan §7).

## Reste à faire
Étapes 1 à 11 du plan.

## Décisions prises
| Date | Décision | Par |
| --- | --- | --- |
| 2026-11-22 | Nom technique de la plateforme : `rundinova-studio` (distinct de `rundinova-production`, l'ERPNext existant) | Claude |
| 2026-11-22 | PostgreSQL 16 dédié en conteneur (pas le PostgreSQL partagé de l'hôte, pas de base gérée externe) | Claude |
| 2026-11-22 | Une seule application Next.js multi-locataire, vendeur résolu par sous-domaine | Claude |

## Décisions en attente
- D1 rundinova.com · D2 Cloudflare · D3 sauvegarde hors serveur · D4 informations métier.
