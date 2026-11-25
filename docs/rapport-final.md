# Rapport final — mise en production de Rundinova Studio

**Date** : 25 novembre 2026 · **Commit déployé** : `b0d8121` (`main` = `origin/main`) · **Run CI** : `45570254740`

## 1. État livré

| Élément | État |
| --- | --- |
| Plateforme multi-vendeurs (DB, sous-domaines, isolation) | ✅ 100 % |
| Krumbz migré vers le modèle unique, identicalité pixel (parité 28/28) | ✅ 100 % |
| Modèle unique (5 à 17 scènes, sections facultatives) | ✅ 100 % |
| Super-admin, espace vendeur, abonnements, QR code, statistiques | ✅ 100 % |
| HTTPS automatique, cache disque, sauvegardes, surveillance, CI | ✅ 100 % |
| Mise en production, bascule Krumbz, suppression préproduction | ✅ 25/11/2026 |
| Branding complémentaire (logo/favicon/polices/SEO par boutique) | ⏳ 65 fichiers modifiés, **non validés**, absents de `main` |
| Sauvegardes hors serveur (Cloudflare R2) | ✅ 100 % — bucket créé, première copie vérifiée, rétention 30 j |

## 2. URLs de production

| Hôte | Rôle | Réponse vérifiée | Certificat |
| --- | --- | --- | --- |
| `https://isoko.rundinova.com` | Site public Rundinova Studio | `200` | `isoko.rundinova.com`, expire 2027-02-23 |
| `https://admin.rundinova.com` | Super-administration | `307` → connexion | `admin.rundinova.com`, expire 2027-02-23 |
| `https://espace.rundinova.com` | Espace vendeur | `307` → connexion | `espace.rundinova.com`, expire 2027-02-23 |
| `https://krumbz.rundinova.com` | Boutique Krumbz (boutique #1) | `200` | `krumbz.rundinova.com`, expire 2027-02-17 |

`rundinova.com` reste le site officiel : aucun changement DNS, aucun passage par Cloudflare. Les certificats sont émis en HTTP-01 par `rundinova-studio-certs.timer`, chargés dynamiquement par nginx (sans rechargement), et renouvelés automatiquement.

## 3. Serveur (VPS `31.97.33.141`)

- Conteneurs actifs : `rundinova-studio` (`127.0.0.1:19300`, healthy), `rundinova-studio-db` (healthy), `krumbz` (`127.0.0.1:19200`, **conservé** pour retour arrière).
- `/api/health` → `{"ok":true,"db":true}` ; les 67 hôtes sondés par `nginx-safe-apply.sh` n'ont aucune régression (avant/après identique : `ok=123`, `5xx=9` préexistants).
- nginx : `zz-rundinova-studio-http.conf` et `zz-rundinova-studio-https.conf` activés ; `conf.d/rundinova-studio.conf` (cache disque 2 Go, `immutable` sur uploads/modèles) installé. Les vhosts staging sont désactivés.
- Base : 14 tables, 1 tenant (`krumbz`), 2 produits, 2 comptes (1 vendeur, 1 super-admin) — migrations `0000_init` + `0001_template_boutique` appliquées.

### Comptes initiaux

Identifiants générés une seule fois et stockés sur le VPS dans **`/root/rundinova-studio-credentials.txt`** (mode `600`) :

- vendeur Krumbz : `+25767309309` (nom `Joffre Niyondiko`) ;
- super-admin : `niyondikojoffreasjubu@gmail.com` (nom `Joffre Niyondiko`).

Les deux comptes exigent un changement de mot de passe à la première connexion. **Les mots de passe ne sont ni dans ce rapport, ni dans le dépôt.**

## 4. Bascule Krumbz et retour arrière

Ordre exécuté le 25/11 :

1. Image conservée : `docker tag ghcr.io/jubuniyokodev/krumbz:latest krumbz:pre-cutover`.
2. Sauvegarde Studio : `/opt/rundinova-studio/backups/20261125T093543Z-pre-cutover` (base + uploads + `SHA256SUMS`).
3. Santé Krumbz vérifiée sur le port 19300 avec `Host: krumbz.rundinova.com` (titre + lien WhatsApp).
4. `proxy_pass` du vhost Krumbz changé de `127.0.0.1:19200` vers `127.0.0.1:19300` via `nginx-safe-apply.sh --expect krumbz.rundinova.com` ; sauvegarde nginx `/root/nginx-backups/nginx-20261125-093616.tar.gz`.
5. Vérification publique : les 4 domaines répondent avec le bon certificat et le bon titre.

Retour arrière (si besoin) :

```bash
bash /opt/rundinova-studio/scripts/nginx-safe-apply.sh --expect krumbz.rundinova.com -- \
  sed -i 's#proxy_pass http://127.0.0.1:19300;#proxy_pass http://127.0.0.1:19200;#' \
  /etc/nginx/sites-enabled/krumbz.rundinova.com
# ou restauration complète :
tar xzf /root/nginx-backups/nginx-20261125-093616.tar.gz -C /
```

Le conteneur `krumbz` reste démarré au moins une semaine. Les sauvegardes nginx des étapes HTTP/HTTPS sont dans `/root/nginx-backups/` (`092551`, `092833`, `093616`).

## 5. Sauvegardes Cloudflare R2 (25/11)

- Bucket : `rundinova-studio-backups` (endpoint `https://c373db36103a5d435da41c5af857e00f.r2.cloudflarestorage.com`).
- `rclone` installé sur le VPS, remote `r2` configisé en `600` ; `RCLONE_REMOTE=r2:rundinova-studio-backups/production` dans `/opt/rundinova-studio/ops.env` (`600`).
- Première copie : `20261125T100551Z-first-r2` (`db.dump`, `uploads.tar.gz`, `SHA256SUMS`, `meta.txt`) — marqueur `last-offsite-success` présent.
- Règle de cycle de vie `expire-30d` : suppression des objets après 30 jours (`maxAge: 2592000`, type `Age`).
- Le cron `backup.sh` (03:15) copie désormais automatiquement chaque sauvegarde dans R2 ; aucune clé n'est versionnée.

## 6. Préproduction

Les conteneurs `rundinova-studio-staging`, `rundinova-studio-staging-db` et le conteneur de migration ponctuel ont été supprimés via `docker compose down --remove-orphans` (volumes conservés, `/opt/rundinova-studio-staging` intact pour recréer la stack). Les vhosts staging sont désactivés, les certificats staging restent en place sans effet. Les conteneurs `rn77-staging-*` appartiennent à un autre projet : **ils n'ont pas été touchés**.

## 7. Décisions encore attendues du propriétaire

1. Confirmer le numéro Lumicash exact (`25767309309` appliqué par hypothèse ; titulaire `Niyondiko Joffre` confirmé).
2. Fournir le numéro et le nom EcoCash (actuellement placeholder désactivé).
3. Fournir les photos réelles des scènes de démonstration et des boutiques.
4. Valider ou écarter les 65 fichiers du travail de branding complémentaire (non fusionnés).
5. ~~Cloudflare R2~~ **Fait le 25/11** : bucket `rundinova-studio-backups` créé, `rclone` installé et configuré en `/root/.config/rclone/rclone.conf` (`600`), `RCLONE_REMOTE` écrit dans `/opt/rundinova-studio/ops.env` (`600`), première sauvegarde `20261125T100551Z-first-r2` vérifiée dans R2, règle de cycle de vie `expire-30d` (suppression à 30 jours) active. Les clés ne sont **ni** dans le dépôt ni dans ce rapport.
6. Relire la traduction kirundi avant toute communication officielle.

## 8. Procédures utiles

- Documentation opérationnelle complète : [`docs/ops.md`](ops.md) et [`deploy/nginx/APPLY.md`](../deploy/nginx/APPLY.md).
- Contrôles CI : `npm run typecheck`, `npm run lint`, `npm run content:check`, `npm run build`, `tests/` (isolation 32/32, parité 28/28, admin 10/10, espace 2/2, variantes 6/6).
- Santé : `curl -H "Host: admin.rundinova.com" http://127.0.0.1:19300/api/health` et `bash /opt/rundinova-studio/scripts/health.sh`.
- Sauvegarde manuelle : `bash /opt/rundinova-studio/scripts/backup.sh --label <label>` ; restauration : `scripts/restore.sh`.
