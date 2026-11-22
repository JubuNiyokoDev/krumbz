# Rundinova Studio — exploitation (ops)

> Document de référence pour faire tourner la plateforme sur le VPS. Décisions : `docs/plan.md`
> (§2, §2 bis, §5). Procédure nginx détaillée : [`deploy/nginx/APPLY.md`](../deploy/nginx/APPLY.md).
> Actions du propriétaire, dans l'ordre : [`docs/ops-checklist-owner.md`](ops-checklist-owner.md).
> **Aucune** commande de ce document n'a encore été lancée sur le VPS.

## 1. Architecture

```
Internet ──► nginx de l'hôte (1.24, 43 sites d'autres projets, INCHANGÉS)
             │  80  : zz-rundinova-studio-http.conf   défi ACME + 301 → HTTPS
             │  443 : zz-rundinova-studio-https.conf  certificat chargé à la volée par hôte
             │        cache disque « rundinova_studio » (≤ 2 Go) pour /_next/static, images, uploads
             ├──► 127.0.0.1:19300  rundinova-studio          (Next.js standalone, prod)
             │                      └─ rundinova-studio-db   (PostgreSQL 16, réseau interne seulement)
             ├──► 127.0.0.1:19301  rundinova-studio-staging  (préproduction, ARRÊTÉE par défaut)
             │                      └─ rundinova-studio-staging-db
             └──► 127.0.0.1:19200  krumbz (conteneur actuel, jusqu'à la bascule)

Hôte : systemd rundinova-studio-certs.timer (chaque minute) → cert-provision.sh → certbot --webroot
       cron : backup.sh 03:15 (→ R2), health.sh toutes les 5 min (→ status/health.json)
```

- **Aucun changement DNS** : l'enregistrement joker existant `*.rundinova.com → VPS` (InterServer) suffit.
- **Pas de Cloudflare, pas de CDN** : cache navigateur (`immutable`) + cache disque nginx dédié.
- Un **seul** projet compose par environnement, tous les noms préfixés `rundinova-studio` : les
  scripts ne touchent à rien d'autre (66 conteneurs d'autres projets sur le VPS).

### Arborescence sur le VPS

| Chemin | Contenu | Droits |
| --- | --- | --- |
| `/opt/rundinova-studio/compose.yml` | copie de `deploy/compose.production.yml` | 644 |
| `/opt/rundinova-studio/.env` | secrets (modèle `deploy/env.production.example`) | 600, utilisateur de déploiement |
| `/opt/rundinova-studio/ops.env` | réglages hôte : `RCLONE_REMOTE`, `ALERT_WEBHOOK_URL`, seuils | 600 root |
| `/opt/rundinova-studio/release.env`, `releases.log` | tag en service, historique des déploiements | écrits par `deploy.sh` |
| `/opt/rundinova-studio/scripts/` | `scripts/ops/*.sh` (sauf selftest) | 755 |
| `/opt/rundinova-studio/db/` | données PostgreSQL | propriétaire 70 (postgres alpine) |
| `/opt/rundinova-studio/uploads/` | photos des vendeurs → `/data/uploads` | 1001:1001 |
| `/opt/rundinova-studio/cert-requests/` | demandes de certificats (écrites par l'app) → `/data/cert-requests` | 1001:1001 |
| `/opt/rundinova-studio/cert-status/` | états `<hôte>.json` (écrits par l'hôte) → `/data/cert-status` (lecture seule) | root 755 |
| `/opt/rundinova-studio/status/health.json` | état de santé → `/data/status/health.json` (lecture seule) | root 755 |
| `/opt/rundinova-studio/backups/` | sauvegardes locales (14 j) | 700 root |
| `/opt/rundinova-studio-staging/` | même structure + `staging.sh` | idem |
| `/etc/rundinova-studio/certs/<hôte>/` | `fullchain.pem`, `privkey.pem` (lien → `.v/<hôte>-<date>`) | 0750/0640 root:www-data |
| `/var/www/rundinova-studio-acme/` | webroot ACME | 755 |
| `/var/cache/nginx/rundinova_studio/` | cache nginx (≤ 2 Go) | www-data |

## 2. Hôtes et ports

| Hôte | Rôle | Amont |
| --- | --- | --- |
| `<vendeur>.rundinova.com` | boutique | 19300 |
| `isoko.rundinova.com` | vitrine Rundinova Studio | 19300 |
| `admin.rundinova.com` | super-admin | 19300 |
| `espace.rundinova.com` | espace vendeur | 19300 |
| `staging.rundinova.com`, `staging-<x>.rundinova.com` | préproduction (mot de passe, `noindex`) | 19301 |
| `krumbz.rundinova.com` | son propre vhost → 19200 aujourd'hui, 19300 après la bascule | — |
| `rundinova.com`, `www.rundinova.com` | **site officiel, jamais servi par la plateforme** (noms exacts de son vhost ; 421 en garde-fou) | — |
| hôtes des autres projets (chat, koraneza…) | leurs vhosts (noms exacts, prioritaires) ; 421 en garde-fou | — |

Le joker nginx ne prend que ce qu'aucun nom exact ne réclame : rien ne change pour les autres sites.

## 3. Budget mémoire

Mesure du VPS (audit) : 4,2 Go disponibles, swap 4 Go plein. Toutes les limites interdisent le swap (`memswap_limit = mem_limit`).

| Conteneur | Mémoire | CPU | Remarque |
| --- | --- | --- | --- |
| `rundinova-studio` | 640 Mo | 1 | `NODE_OPTIONS=--max-old-space-size=384` |
| `rundinova-studio-db` | 256 Mo | 0,5 | `shared_buffers=64MB`, 30 connexions, JIT et parallélisme coupés |
| `migrate` (ponctuel) | 256 Mo | 0,5 | quelques secondes par déploiement |
| **Production** | **≈ 0,9 Go max** | | Krumbz actuel : 728 Mo sans limite (libéré après la bascule) |
| `rundinova-studio-staging` | 512 Mo | 0,5 | `--max-old-space-size=320` ; arrêtée par défaut |
| `rundinova-studio-staging-db` | 160 Mo | 0,25 | |
| **Préproduction** | **≈ 0,7 Go max** | | `staging.sh up` refuse de démarrer sous 900 Mo disponibles |

Mesure locale de l'image (build Krumbz actuel) : **≈ 70 Mo** au repos après démarrage, conteneur sain.

## 4. Déploiement

### CI/CD (`.github/workflows/`)

| Workflow | Déclencheur | Contenu | Durée estimée |
| --- | --- | --- | --- |
| `ci.yml` | PR, push hors main/staging, appelé par les deux suivants | `npm ci`, migrations + seed (si `scripts/db-migrate.mts`), typecheck, lint, `content:check`, build, Playwright **smoke bureau** (`pages`, `order`, `mushroom`) | 4–6 min (3–4 min avec caches Playwright/Next chauds) |
| `deploy.yml` | push `main`, manuel | `verify` (ci.yml) ‖ `build` (image `sha-<7>`) → `deploy` Krumbz (comme avant : `/opt/krumbz`, `latest` promu seulement après verify) ; `studio-deploy` si `STUDIO_DEPLOY_ENABLED == 'true'` | ≈ 6–8 min (avant : ≈ 19 min) |
| `e2e-nightly.yml` | 01:30 UTC, manuel | suite Playwright complète, bureau + mobile en parallèle, non bloquante | ≈ 12–18 min |
| `deploy-staging.yml` | push `staging`, manuel | verify ‖ build `staging-sha-<7>` → redéploie si la préproduction tourne, sinon enregistre seulement le tag | ≈ 6–8 min |

Secrets (noms) : `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `GITHUB_TOKEN` (automatique). Variable de dépôt :
`STUDIO_DEPLOY_ENABLED` (`true` seulement quand le serveur est préparé).

### Ce que fait `scripts/deploy.sh production sha-xxxxxxx`

1. verrou (un seul déploiement à la fois), contrôle de `.env` (600) et des dossiers ;
2. `docker compose pull` (images du projet uniquement), base démarrée et saine ;
3. **sauvegarde pré-déploiement** (`backup.sh --label pre-deploy-<sha>`) — échec ⇒ déploiement annulé ;
4. migrations : service ponctuel `migrate` = `node /app/migrator/scripts/db-migrate.mts` (**le même
   script que `npm run db:migrate`**, une seule voie de migration) — échec ⇒ ancienne version toujours en service ;
5. redémarrage de l'app, attente de l'état `healthy` (`GET /api/health` → 200 `{ok:true, db:true}`) ;
6. sinon **retour arrière automatique** sur le tag précédent ; succès ⇒ `release.env`, `releases.log` ;
7. ménage : seules nos images `sha-*` au-delà des 3 plus récentes (+ courante + précédente).

Manuellement sur le VPS : `/opt/rundinova-studio/scripts/deploy.sh production sha-1a2b3c4`.

### Retour arrière

- **Depuis GitHub** : Actions → *Deploy* → *Run workflow* → `tag = sha-<7>` d'un déploiement précédent
  (pas de compilation ; redéploie Krumbz et, si activé, Studio).
- **Sur le VPS** : `cat /opt/rundinova-studio/releases.log` puis `scripts/deploy.sh production <tag précédent>`.
- Les migrations ne se défont pas : elles doivent rester compatibles avec la version précédente
  (ajouter avant de retirer). En dernier recours : `restore.sh` (§6) de la sauvegarde `pre-deploy-*`.

### Première mise en service (production)

```bash
cd /opt/rundinova-studio
install -m 644 /root/rundinova-studio-src/deploy/compose.production.yml compose.yml
install -m 600 /root/rundinova-studio-src/deploy/env.production.example .env && nano .env   # vraies valeurs
docker login ghcr.io            # seulement si le paquet ghcr.io/jubuniyokodev/rundinova-studio est privé
scripts/deploy.sh production sha-<7>   # premier déploiement (pas de sauvegarde préalable : base vide)
docker compose -p rundinova-studio -f compose.yml ps
curl -s -H 'Host: admin.rundinova.com' http://127.0.0.1:19300/api/health    # {"ok":true,"db":true}
```

Puis amorcer les données (super-admin, Krumbz) selon le README de l'app, et `install -m 644 deploy/cron/rundinova-studio /etc/cron.d/`
(+ `deploy/cron/logrotate-rundinova-studio` → `/etc/logrotate.d/rundinova-studio`).

## 5. Préproduction (arrêtée par défaut)

```bash
/opt/rundinova-studio-staging/staging.sh up            # tag de release.env (dernier push sur « staging »)
/opt/rundinova-studio-staging/staging.sh up staging-sha-1a2b3c4
/opt/rundinova-studio-staging/staging.sh status        # conteneurs, mémoire, /api/health
/opt/rundinova-studio-staging/staging.sh logs 200
/opt/rundinova-studio-staging/staging.sh down          # données conservées (db/, uploads/)
```

Installation : même arborescence sous `/opt/rundinova-studio-staging/` (`compose.yml` ← `deploy/compose.staging.yml`,
`.env` ← `deploy/env.staging.example` avec d'**autres** secrets, `staging.sh` ← `deploy/staging.sh`, dossiers `db uploads
cert-requests cert-status status`). Accès : mot de passe `/etc/rundinova-studio/staging.htpasswd` (utilisateur `recette`),
en-tête `X-Robots-Tag: noindex`. Quand elle est arrêtée, nginx affiche une page 503 explicite.
Après un redémarrage du VPS, elle **ne redémarre pas** (politique `on-failure`).

## 6. Sauvegarde et restauration

- `backup.sh` (cron 03:15) : `pg_dump -Fc` (vérifié par `pg_restore -l`) + archive des uploads (conteneur
  jetable sans réseau, lecture seule), `SHA256SUMS`, `meta.txt` ; rotation locale **14 jours** ;
  copie hors serveur si `RCLONE_REMOTE` est défini ; marqueurs `last-success` / `last-offsite-success`.
- `restore.sh <sauvegarde> [--into <base>] [--db-only|--uploads-only] [--yes]` : vérifie les sommes,
  restaure dans une base **neuve**, puis bascule (l'ancienne base est **conservée** sous
  `studio_pre_restore_<date>`), uploads actuels archivés avant remplacement, app arrêtée puis relancée.

```bash
ls /opt/rundinova-studio/backups/
/opt/rundinova-studio/scripts/restore.sh 20261122T031500Z --into studio_check   # inspection, rien d'autre ne change
/opt/rundinova-studio/scripts/restore.sh 20261122T031500Z                        # restauration complète (confirmation)
# Depuis R2 (serveur neuf) :
rclone copy r2:rundinova-studio-backups/production/20261122T031500Z /opt/rundinova-studio/backups/20261122T031500Z
```

**Test réel** (`scripts/ops/selftest-backup-restore.sh`, conteneurs jetables `postgres:16-alpine`, 22/11/2026) :

```
== backup.sh
  ok - sauvegarde créée : 20261122T131215Z-selftest (316K)
  ok - copie hors serveur (rclone) complète et vérifiée
  ok - rotation 14 jours (ancien supprimé, récent conservé)
== restore.sh --into (inspection, même serveur)
  ok - restore --into : données identiques, app non touchée
== restore.sh complet sur un serveur neuf (B)
  ok - base B identique à A (md5 51560eff496f029717b115b54344fdba)
  ok - uploads B (dossier lié de l'hôte) identiques à A (contenu + propriétaire 1001)
  ok - ancienne base de B conservée (studio_pre_restore_*)
  ok - application arrêtée puis redémarrée
  ok - séquences restaurées (prochain id = 501)
  ok - sauvegarde depuis un dossier lié de l'hôte (mode production) : mêmes fichiers
== sauvegarde corrompue refusée
  ok - corruption détectée (SHA256SUMS), rien restauré
== 11 vérifications réussies
```

### Cloudflare R2 (copie hors serveur, décision D3) — étapes pour le propriétaire

R2 est un stockage objet : **aucun lien avec le DNS**, rien ne change pour `rundinova.com`.

1. Tableau de bord Cloudflare → **R2** → activer (offre gratuite : 10 Go, sans frais de sortie).
2. **Create bucket** : `rundinova-studio-backups` (région automatique).
3. Bucket → *Settings* → **Object lifecycle rules** → *Add rule* : préfixe vide, **supprimer les objets 30 jours** après leur création.
4. R2 → **Manage R2 API Tokens** → *Create API token* : permission **Object Read & Write**, limité au
   bucket `rundinova-studio-backups`, sans expiration (ou 1 an, à renouveler). Noter *Access Key ID*,
   *Secret Access Key* et l'URL `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (affichés une seule fois).
5. Sur le VPS (root) :
   ```bash
   apt-get install -y rclone          # ou paquet déjà présent
   rclone config create r2 s3 provider=Cloudflare env_auth=false \
     access_key_id=<ACCESS_KEY_ID> secret_access_key=<SECRET_ACCESS_KEY> \
     endpoint=https://<ACCOUNT_ID>.r2.cloudflarestorage.com acl=private no_check_bucket=true
   chmod 600 /root/.config/rclone/rclone.conf
   rclone lsd r2:rundinova-studio-backups        # doit répondre sans erreur
   install -m 600 /dev/null /opt/rundinova-studio/ops.env
   echo 'RCLONE_REMOTE=r2:rundinova-studio-backups/production' >> /opt/rundinova-studio/ops.env
   /opt/rundinova-studio/scripts/backup.sh --label first-r2 && rclone ls r2:rundinova-studio-backups/production | tail
   ```
6. Une fois par trimestre : restaurer une sauvegarde R2 avec `--into studio_check` (puis `dropdb`).

## 7. Certificats HTTPS

### Fonctionnement

1. La super-admin crée une boutique ⇒ l'app écrit un fichier nommé `<hôte>` dans `/data/cert-requests`
   (`CERT_REQUESTS_DIR`, hôte : `/opt/rundinova-studio/cert-requests`).
2. `rundinova-studio-certs.timer` (chaque minute) lance `cert-provision.sh` (root) qui, dans l'ordre :
   nom valide `^[a-z0-9-]+\.rundinova\.com$` (un seul niveau) → nom non réservé (autres projets, `www`…) →
   hôte servi par un autre vhost ⇒ `external` (sauf `ALLOW_EXTERNAL`, ex. krumbz) → certificat déjà valide
   ⇒ `issued` → recul après échec (15 min, 1 h, 6 h, 24 h) → **plafond 20 émissions / 7 jours** ⇒ `queued`
   (la limite Let's Encrypt de 50/semaine est partagée par **tous** les projets de `rundinova.com`) →
   DNS = ce serveur → auto-test du webroot par le port 80 (aucun essai Let's Encrypt gaspillé) →
   `certbot certonly --webroot -w /var/www/rundinova-studio-acme --cert-name rs-<hôte>`.
3. Le *deploy hook* `cert-deploy-hook.sh` copie la paire dans `/etc/rundinova-studio/certs/<hôte>/`
   (0640 root:www-data, bascule atomique d'un lien), écrit l'état, **sans recharger nginx** : le bloc 443
   charge `ssl_certificate /etc/rundinova-studio/certs/$rs_cert_host/fullchain.pem` à chaque poignée de main
   (`$rs_cert_host` = `$ssl_server_name` assaini : jamais de chemin arbitraire tiré du SNI).
4. Renouvellement : timer certbot existant + même hook (aucun rechargement).

État lu par l'app (`/data/cert-status/<hôte>.json`, `CERT_STATUS_DIR`) :

```json
{"host":"chaussures.rundinova.com","status":"issued","expiresAt":"2027-02-20T10:00:00Z","error":null,
 "state":"issued","message":"Certificat HTTPS actif","updatedAt":"2026-11-22T10:01:02Z","attempts":0,"nextAttemptAt":null}
```

`status` ∈ `pending | issued | error` (contrat de l'app) ; `state` détaille : `pending`, `queued` (plafond),
`issued`, `external` (servi par un autre vhost), `error` (avec `nextAttemptAt`), `rejected` (nom refusé).

### Dépannage

| Symptôme | Vérifier |
| --- | --- |
| reste `pending` | `systemctl list-timers rundinova-studio-certs.timer` ; `journalctl -u rundinova-studio-certs -n 50` |
| `error` « port 80 ne sert pas le dossier ACME » | `curl -i http://<hôte>/.well-known/acme-challenge/x --resolve <hôte>:80:127.0.0.1` doit répondre 404 **de notre bloc** (pas 301 d'un autre site) ; bloc `zz-rundinova-studio-http` activé ? |
| `error` « DNS ne pointe pas » | `getent ahostsv4 <hôte>` → 31.97.33.141 |
| `queued` | plafond atteint : `wc -l /var/lib/rundinova-studio-certs/issued.log` ; reprise automatique (fenêtre glissante de 7 jours) |
| `error` certbot `too many certificates` | limite Let's Encrypt partagée atteinte par un autre projet : attendre (le recul passe à 24 h) |
| relancer tout de suite | `rm /var/lib/rundinova-studio-certs/<hôte>.attempts && touch /opt/rundinova-studio/cert-requests/<hôte>` |
| poignée de main refusée | `ls -l /etc/rundinova-studio/certs/<hôte>/` ; `tail /var/log/nginx/error.log` (« cannot load certificate ») ; droits 0640 root:www-data |
| essai sans limite | `CERTBOT_EXTRA=--test-cert` dans `/etc/rundinova-studio/certs.env` |

## 8. Cache (sans CDN)

- `/_next/static/*` : `immutable` 1 an (Next.js), cache nginx partagé entre toutes les boutiques.
- `/uploads/*`, `/demo/*` : nginx impose `Cache-Control: public, max-age=31536000, immutable` (noms
  uniques à l'envoi : un changement de photo = nouveau nom).
- `/models`, `/textures`, `/images`, `/basis`, `/vendor` : durée donnée par l'app (`next.config.ts` : 1 jour +
  `stale-while-revalidate` ; `basis`/`vendor` immutable). Les fichiers Krumbz de ces dossiers ont des noms
  **non versionnés** : les passer en `immutable` figerait une image remplacée jusqu'à 1 an chez les
  visiteurs. À faire seulement après versionnage des noms (décision du propriétaire).
- `/_next/image` : mis en cache par nginx (clé = hôte + URL + format négocié), évite de recalculer (CPU).
- Zone `rundinova_studio` : index 20 Mo, ≤ 2 Go disque, entrées inutilisées 30 j. `X-Cache-Status` en en-tête.
  Vider : `rm -rf /var/cache/nginx/rundinova_studio/*` (sans rechargement).

## 9. Surveillance

`health.sh` (cron toutes les 5 min) vérifie l'hôte (mémoire, swap, charge, disques), **nos** conteneurs
(état, santé, mémoire / limite), `GET /api/health`, chaque boutique de `GET /api/health/shops`
(origine 127.0.0.1:19300 avec l'en-tête `Host`, puis URL publique HTTPS) et l'âge de la dernière sauvegarde.
Code de sortie 0/1/2 ; alerte facultative sur **changement** d'état (`ALERT_WEBHOOK_URL` dans `ops.env`).

Fichier : hôte `/opt/rundinova-studio/status/health.json` → app `/data/status/health.json`
(lecture seule, variable `HEALTH_STATUS_FILE`), lu par la page « Santé » du super-admin.

```jsonc
{
  "version": 1,
  "stack": "production",
  "generatedAt": "2026-11-22T13:13:02Z",
  "status": "ok | warn | critical",
  "host": { "memAvailableMb": 4200, "memTotalMb": 15990, "swapUsedPct": 99.8, "load": [2.7, 2.5, 2.4], "cpus": 4 },
  "disks": [{ "mount": "/", "usedPct": 74, "freeMb": 51200 }],
  "containers": [{ "name": "rundinova-studio", "state": "running", "health": "healthy", "image": "ghcr.io/…:sha-1a2b3c4",
                   "restarts": 0, "memLimitMb": 640, "memUsedMb": 182.4, "memPct": 28.5, "cpuPct": 0.4 }],
  "app": { "code": 200, "ms": 11, "ok": true, "db": true },
  "shops": [{ "slug": "krumbz", "host": "krumbz.rundinova.com", "status": "active", "ok": true,
              "origin": { "code": 200, "ms": 85 }, "public": { "code": 200, "ms": 140 } }],
  "backup": { "lastSuccessAgeHours": 10 },
  "alerts": [{ "level": "warn", "message": "dernière sauvegarde il y a 30 h" }]
}
```

Seuils (surchargeables dans `ops.env`) : mémoire hôte < 800 Mo warn / < 400 Mo critical ; disque ≥ 85 % / 92 % ;
conteneur ≥ 90 % de sa limite ; sauvegarde > 26 h ; boutique active en échec = critical, en pause = warn.
Contrat attendu de l'app : `GET /api/health` → 200 `{"ok":true,"db":true}` ; `GET /api/health/shops` →
`{"shops":[{"slug","host","status"}]}` (jeton `HEALTH_TOKEN` facultatif, en-tête `Authorization: Bearer`).

## 10. Tests locaux de l'infrastructure (jamais sur le VPS)

```bash
scripts/ops/selftest-backup-restore.sh     # 11 vérifications (ci-dessus)
scripts/ops/selftest-nginx.sh              # 18 vérifications, nginx 1.24.0 Ubuntu
SELFTEST_NGINX_IMAGE=nginx:1.24 scripts/ops/selftest-nginx.sh   # sans réseau (image officielle 1.24.0)
docker run --rm -v "$PWD:/mnt:ro" -w /mnt koalaman/shellcheck:stable -x -S style scripts/ops/*.sh deploy/staging.sh
```

Dernière exécution de `selftest-nginx.sh` (22/11/2026, `nginx/1.24.0 (Ubuntu)`, OpenSSL 3.0.13) :

```
  ok - imitation du VPS : 3 vhosts existants servis
  ok - étape A appliquée sans régression (dont le snippet ACME dans le bloc 443 de krumbz)
  ok - port 80 : redirection, 421 pour un hôte d'un autre projet, rundinova.com/www intacts
  ok - émission : 2 émis, 3e en file (plafond=2), krumbz external, www rejected, noms invalides ignorés ; JSON au contrat de l'app
  ok - file d'attente reprise quand le plafond le permet ; clé 0640 root:www-data
  ok - toutes les demandes traitées
  ok - krumbz : certificat rs-krumbz émis à travers son vhost existant (redirection 80→443), site inchangé
  ok - étape C appliquée sans régression, hôtes attendus en HTTPS valide
  ok - HTTPS : plateforme servie avec Host, autres sites et Krumbz inchangés
  ok - cache nginx : /_next/static partagé entre hôtes (HIT)
  ok - uploads : Cache-Control immutable 1 an (en-tête de l'app remplacé, pas dupliqué)
  ok - nouvel hôte après activation du 443 : émis puis servi en HTTPS valide SANS rechargement (workers inchangés)
  ok - préproduction : 401 sans mot de passe, 503 explicite quand arrêtée
  ok - hôte sans certificat refusé à la poignée de main ; hôte d'un autre projet → 421
  ok - renouvellement : nouveau certificat servi sans recharger nginx
  ok - site cassé (502) → retour arrière automatique, site rétabli
  ok - erreur de syntaxe → nginx -t refuse, configuration d'origine remise sans rechargement
  ok - bascule Krumbz 19200→19300 et retour arrière
== 18 vérifications nginx réussies
```

Cause de l'ancien échec du test nginx : le DNS du démon Docker local est **intermittent** pendant les
`docker build` (`EAI_AGAIN`, « Temporary failure resolving ») ; ce n'est pas lié au VPS. Le script retombe
désormais sur l'image officielle `nginx:1.24` (même nginx 1.24.0) si la construction échoue, et le
conteneur de test tourne sans réseau. Pour un build local : `docker build --network=host …`.

## 11. Passer plus tard à Cloudflare (non implémenté)

Explication seulement ; rien n'est préparé dans ce dépôt.

- **Option A — migrer `rundinova.com` vers Cloudflare (NS chez Cloudflare)** : certificat joker
  `*.rundinova.com` (DNS-01 automatique) et CDN pour toutes les boutiques. Mais **tous** les projets
  du VPS (koraneza, chat, livekit, tableyawe…) passeraient par la même zone : réimport de tous les
  enregistrements, risque sur des services temps réel (WebSocket, LiveKit/UDP non proxifiable),
  décision collective. Coût : gratuit (offre Free) ; effort : 1 journée + vérification de chaque projet.
- **Option B — domaine dédié aux boutiques** (ex. `rundinova.shop`) chez Cloudflare : isolement total,
  joker + CDN, aucun impact sur les autres projets ; coût : ≈ 10–40 $/an ; changement d'URL des boutiques
  (redirections 301 depuis `*.rundinova.com`). Côté plateforme : `PLATFORM_ROOT_DOMAIN`, un certificat
  d'origine Cloudflare, `real_ip_header CF-Connecting-IP`, suppression de la file de certificats.
- Les deux options gardent l'app, la base et les sauvegardes telles quelles ; seule la couche nginx/certificats change.
