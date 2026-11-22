# Rundinova Studio — actions du propriétaire (dans l'ordre)

Chaque ligne demande **votre accord ou votre action**. Rien n'a été fait sur le VPS à ce jour.
Détails : [`docs/ops.md`](ops.md) et [`deploy/nginx/APPLY.md`](../deploy/nginx/APPLY.md).

| # | Action | Qui | Accord requis | Réversible |
| --- | --- | --- | --- | --- |
| 1 | Valider la nouvelle CI : job rapide bloquant (~4–6 min), suite complète la nuit (non bloquante). Fusionner les workflows dans `main` **redéploie Krumbz** (même procédure qu'aujourd'hui) | Propriétaire | Oui | Oui (revert) |
| 2 | Cloudflare R2 : créer le bucket `rundinova-studio-backups`, règle de cycle de vie 30 jours, jeton API limité au bucket (ops.md §6). Me transmettre les clés **hors dépôt** ou les saisir vous-même sur le VPS | Propriétaire | — | Oui |
| 3 | Rendre public le paquet `ghcr.io/jubuniyokodev/rundinova-studio` **ou** faire `docker login ghcr.io` sur le VPS (comme pour `krumbz`) | Propriétaire | — | Oui |
| 4 | Autoriser la création de `/opt/rundinova-studio` (+ `-staging`), `/etc/rundinova-studio`, `/var/www/rundinova-studio-acme`, du cache `/var/cache/nginx/rundinova_studio` (APPLY.md étape 1) | Propriétaire | Oui | Oui |
| 5 | Remplir `/opt/rundinova-studio/.env` (mots de passe générés sur place : `openssl rand -hex 24`, `openssl rand -base64 48`) | Propriétaire / Claude sur le VPS | Oui | Oui |
| 6 | **Modification nginx n° 1** (étape A : conf.d, port 80, snippet ACME dans le bloc 443 du vhost krumbz) — un rechargement, sondes de tous les sites, retour arrière automatique | Propriétaire présent | **Oui** | Oui (automatique) |
| 7 | Installer le service `rundinova-studio-certs` (systemd) et émettre 4 certificats Let's Encrypt (isoko, admin, espace, krumbz) — essai `--test-cert` d'abord ; 4 émissions sur la limite **partagée** de 50/semaine de `rundinova.com` | Propriétaire | **Oui** | Oui (`certbot delete`) |
| 8 | Premier déploiement de la production Studio sur 127.0.0.1:19300 (≈ 0,9 Go de mémoire au maximum) | Propriétaire | **Oui** | Oui (`docker compose down`) |
| 9 | **Modification nginx n° 2** (étape C : bloc 443 de la plateforme) — un rechargement | Propriétaire présent | **Oui** | Oui (automatique) |
| 10 | Installer les tâches cron (sauvegarde 03:15, surveillance 5 min) et `ops.env` avec `RCLONE_REMOTE` ; vérifier la 1re copie R2 | Propriétaire | Oui | Oui |
| 11 | Mettre la variable de dépôt `STUDIO_DEPLOY_ENABLED=true` (GitHub → Settings → Variables) pour activer les déploiements automatiques de Studio | Propriétaire | Oui | Oui (`false`) |
| 12 | Préproduction : créer `/opt/rundinova-studio-staging`, son `.env` (autres secrets), mot de passe `recette` ; la démarrer seulement pour une recette (`staging.sh up`/`down`) ; certificats `staging-*` à la demande (comptent dans le plafond) | Propriétaire | Oui | Oui |
| 13 | **Bascule de Krumbz** (19200 → 19300, une ligne) après recette complète et sauvegarde (image `krumbz`, `/opt/krumbz`, base) ; retour arrière en une ligne | Propriétaire présent | **Oui** | Oui (une ligne) |
| 14 | Après ≥ 1 semaine sans incident : arrêt du conteneur `krumbz` (libère ≈ 730 Mo) | Propriétaire | Oui | Oui (image conservée) |
| 15 | Décider plus tard : noms versionnés pour `/images` et `/models` de Krumbz (permettrait `immutable`), retrait du vhost krumbz, passage éventuel à Cloudflare (ops.md §11) | Propriétaire | Oui | — |

À ne jamais faire sans accord : toucher aux autres vhosts, au PostgreSQL partagé de l'hôte, au stockage
`rundinova-storage`, aux conteneurs d'autres projets, au DNS chez InterServer, au pare-feu.
