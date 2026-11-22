# Suivi — Rundinova Studio

> Mis à jour après chaque étape. En cas d'interruption, reprendre à partir de « En cours ».
> Plan et architecture : [`plan.md`](plan.md).

## Fait
- 2026-11-22 — Audit du VPS en lecture seule (voir plan §1). Aucune modification sur le serveur.
- 2026-11-22 — Plan et architecture rédigés (`docs/plan.md`).

- 2026-11-22 — Étape 0 : référence visuelle Krumbz (28 captures, stable sur 2 passes), `playwright.parity.config.ts`.
- 2026-11-22 — Contrat partagé `src/lib/tenant/types.ts`.

## En cours (sous-agents, branches de worktree)
- Fondation + migration Krumbz (base, résolution par sous-domaine, Krumbz vendeur n°1, parité visuelle).
- Template générique « vitrine » + boutique de démonstration chaussures.
- Site Rundinova Studio (isoko.rundinova.com).
- Infrastructure (compose, nginx préparé, sauvegardes R2, surveillance, CI rapide) — fichiers seulement, rien sur le serveur.

## Reste à faire
Étapes 1 à 11 du plan.

## Décisions prises
| Date | Décision | Par |
| --- | --- | --- |
| 2026-11-22 | Nom technique de la plateforme : `rundinova-studio` (distinct de `rundinova-production`, l'ERPNext existant) | Claude |
| 2026-11-22 | PostgreSQL 16 dédié en conteneur (pas le PostgreSQL partagé de l'hôte, pas de base gérée externe) | Claude |
| 2026-11-22 | Une seule application Next.js multi-locataire, vendeur résolu par sous-domaine | Claude |

| 2026-11-22 | Vitrine Studio sur isoko.rundinova.com, rundinova.com intact | Propriétaire |
| 2026-11-22 | DNS chez Cloudflare | Propriétaire |
| 2026-11-22 | Sauvegarde hors serveur : Cloudflare R2 | Propriétaire |

## Décisions en attente
- D4 informations métier (WhatsApp Rundinova, numéros Lumicash/EcoCash, photos démo) : valeurs provisoires en attendant.
