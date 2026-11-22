# nginx — première installation de Rundinova Studio sur le VPS (procédure validée par le propriétaire)

> **Modification partagée** : le nginx du VPS sert 43 sites d'autres projets. Rien de ce document ne
> s'exécute sans **l'accord explicite du propriétaire**, à une heure creuse, par une personne
> connectée en root (`sudo -i`). Chaque étape passe par `scripts/ops/nginx-safe-apply.sh` :
> sondes de **tous** les sites avant/après, sauvegarde de `/etc/nginx`, `nginx -t`, **un seul**
> rechargement, retour arrière automatique si un site régresse.
>
> Testé localement (nginx 1.24.0 Ubuntu, conteneur jetable qui imite le VPS) :
> `scripts/ops/selftest-nginx.sh` → **18 vérifications réussies** (voir `docs/ops.md`).

Fichiers concernés (dépôt → VPS) :

| Dépôt | VPS |
| --- | --- |
| `deploy/nginx/conf.d/rundinova-studio.conf` | `/etc/nginx/conf.d/rundinova-studio.conf` |
| `deploy/nginx/snippets/rundinova-studio-cache.conf` | `/etc/nginx/snippets/` |
| `deploy/nginx/snippets/rundinova-studio-acme.conf` | `/etc/nginx/snippets/` |
| `deploy/nginx/sites-available/zz-rundinova-studio-http.conf` | `/etc/nginx/sites-available/` + lien `sites-enabled/` |
| `deploy/nginx/sites-available/zz-rundinova-studio-https.conf` | `/etc/nginx/sites-available/` + lien `sites-enabled/` |
| `scripts/ops/*.sh` | `/opt/rundinova-studio/scripts/` |
| `deploy/systemd/rundinova-studio-certs.{service,timer}` | `/etc/systemd/system/` |
| `deploy/cron/rundinova-studio` | `/etc/cron.d/rundinova-studio` |

Les commandes ci-dessous supposent une copie du dépôt (branche validée) dans `/root/rundinova-studio-src`
(ex. `git clone --depth 1 -b main https://github.com/<compte>/krumbz-website /root/rundinova-studio-src`).

```bash
SRC=/root/rundinova-studio-src
S=/opt/rundinova-studio/scripts
```

---

## Étape 0 — Contrôles en lecture seule (aucun changement)

```bash
nginx -v                                   # attendu : nginx/1.24.x (variables dans ssl_certificate ≥ 1.15.9)
nginx -t                                   # la configuration ACTUELLE doit déjà passer
grep -h server_name /etc/nginx/sites-enabled/* | sort -u      # inventaire des sites (gardé ci-dessous)
grep -h server_name /etc/nginx/sites-enabled/* | sort -u > /root/rs-server-names-before.txt
```

| Contrôle | Commande | Attendu |
| --- | --- | --- |
| C1 aucun `default_server` | `grep -rn default_server /etc/nginx/sites-enabled/ /etc/nginx/conf.d/` | rien (sinon : noter lequel, il reste le défaut, sans impact) |
| C2 aucun autre joker `rundinova.com` | `grep -rnE 'server_name[^;]*\*\.rundinova\.com' /etc/nginx/sites-enabled/` | rien |
| C3 site officiel = noms exacts | `grep -rnE 'server_name[^;]*(^|[[:space:]])(www\.)?rundinova\.com' /etc/nginx/sites-enabled/` | le vhost du site officiel liste `rundinova.com` et `www.rundinova.com` en **noms exacts** |
| C4 rien de déjà nommé `rundinova-studio` | `ls /etc/nginx/conf.d/ /etc/nginx/sites-enabled/ \| grep -i rundinova-studio` | rien |
| C5 IPv6 | `grep -rn 'listen \[::\]' /etc/nginx/sites-enabled/ \| head` | si des vhosts écoutent `[::]:80/443`, décommenter les lignes `listen [::]…` de nos 2 fichiers (sinon laisser commentées : le DNS joker n'a qu'un enregistrement A) |
| C6 options du port 443 | `grep -rhn 'listen .*443' /etc/nginx/sites-enabled/ \| sort \| uniq -c` | noter (ex. `http2`) : notre bloc n'ajoute aucune option, le socket garde celles du serveur par défaut |
| C7 certbot | `command -v certbot; systemctl list-timers \| grep -i certbot` | certbot présent, renouvellement planifié (paquet `certbot.timer` ou snap `snap.certbot.renew.timer`) |
| C8 vhost krumbz | `KRUMBZ_SITE=$(readlink -f "$(grep -l 'server_name[^;]*krumbz\.rundinova\.com' /etc/nginx/sites-enabled/*)"); echo "$KRUMBZ_SITE"; grep -n 'acme-challenge\|ssl_certificate_key\|proxy_pass' "$KRUMBZ_SITE"` | un seul fichier ; pas de `location` `acme-challenge` existante (sinon ne pas ajouter le snippet, voir étape A) ; `proxy_pass http://127.0.0.1:19200;` |
| C9 mémoire | `free -m` | ≥ 1,2 Go disponibles avant de démarrer la production Studio |

Sondes initiales (aucun changement, ne fait qu'interroger chaque site par `curl --resolve` sur 127.0.0.1) :

```bash
bash $SRC/scripts/ops/nginx-safe-apply.sh --dry-run | tee /root/rs-probes-before.txt
```

Pourquoi `rundinova.com` et `www.rundinova.com` ne sont **jamais** servis par la plateforme :
`*.rundinova.com` ne correspond pas à `rundinova.com` (le joker exige un libellé) ; `www.rundinova.com`
est un **nom exact** de son vhost, prioritaire sur tout joker (ordre nginx : nom exact → joker en tête
le plus long → joker en fin → regex). En plus, `$rs_foreign` (conf.d) répond 421 si un jour ces noms
tombaient dans notre bloc. Vérifié par C3 et, après chaque étape, par les sondes (+ commande en fin
de document).

## Étape 1 — Fichiers et dossiers (sans effet sur nginx)

```bash
install -d -m 755 /opt/rundinova-studio /opt/rundinova-studio/scripts /opt/rundinova-studio/status \
                  /opt/rundinova-studio/cert-status /var/www/rundinova-studio-acme /var/log/rundinova-studio
install -d -m 700 /opt/rundinova-studio/backups /opt/rundinova-studio/db
install -d -m 750 -o 1001 -g 1001 /opt/rundinova-studio/uploads
install -d -m 755 -o 1001 -g 1001 /opt/rundinova-studio/cert-requests
install -d -m 750 -o root -g www-data /etc/rundinova-studio /etc/rundinova-studio/certs
install -d -m 700 -o www-data -g www-data /var/cache/nginx/rundinova_studio
install -m 755 $SRC/scripts/ops/*.sh $S/ && rm -f $S/selftest-*.sh
# Mot de passe de la préproduction (requis par le bloc 443) — utilisateur « recette » :
printf 'recette:%s\n' "$(openssl passwd -apr1)" > /etc/rundinova-studio/staging.htpasswd
chown root:www-data /etc/rundinova-studio/staging.htpasswd && chmod 640 /etc/rundinova-studio/staging.htpasswd
```

## Étape A — conf.d + port 80 + snippet ACME de krumbz (UN rechargement)

Effet attendu : les hôtes de la plateforme répondent sur le port 80 (défi ACME, sinon 301 vers
HTTPS) ; **aucun** autre site ne change ; le vhost krumbz gagne seulement l'emplacement
`/.well-known/acme-challenge/` dans son bloc 443 (chemin inexistant dans l'app).
Si C8 a montré une `location acme-challenge` existante dans le vhost krumbz, retirer les deux
lignes `sed`/`grep` ci-dessous (krumbz sera alors traité plus tard, étape B ne l'inclut pas).

```bash
bash $S/nginx-safe-apply.sh --expect krumbz.rundinova.com -- bash -c "
  set -e
  install -m 644 $SRC/deploy/nginx/conf.d/rundinova-studio.conf /etc/nginx/conf.d/
  install -m 644 $SRC/deploy/nginx/snippets/rundinova-studio-cache.conf $SRC/deploy/nginx/snippets/rundinova-studio-acme.conf /etc/nginx/snippets/
  install -m 644 $SRC/deploy/nginx/sites-available/zz-rundinova-studio-http.conf /etc/nginx/sites-available/
  ln -s /etc/nginx/sites-available/zz-rundinova-studio-http.conf /etc/nginx/sites-enabled/
  sed -i '/ssl_certificate_key .*krumbz\.rundinova\.com/a\    include /etc/nginx/snippets/rundinova-studio-acme.conf;' $KRUMBZ_SITE
  test \$(grep -c rundinova-studio-acme.conf $KRUMBZ_SITE) -eq 1
"
```

Le script affiche `ok : aucun site dégradé` ou restaure automatiquement `/etc/nginx` (code 1).
Sauvegarde + sondes avant/après : `/root/nginx-backups/nginx-<date>.tar.gz` et `.probes-*.txt`.

## Étape B — Certificats d'isoko / admin / espace / krumbz par le port 80 (AVANT le 443)

```bash
install -m 644 $SRC/deploy/systemd/rundinova-studio-certs.service $SRC/deploy/systemd/rundinova-studio-certs.timer /etc/systemd/system/
# Facultatif : adresse de contact Let's Encrypt
install -m 600 /dev/null /etc/rundinova-studio/certs.env && echo 'LE_EMAIL=<adresse du propriétaire>' >> /etc/rundinova-studio/certs.env
systemctl daemon-reload

# 1) Essai sur l'environnement de TEST Let's Encrypt (ne consomme pas la limite de production) :
for h in isoko admin espace krumbz; do touch /opt/rundinova-studio/cert-requests/$h.rundinova.com; done
CERTBOT_EXTRA=--test-cert WEEKLY_CAP=50 $S/cert-provision.sh
cat /opt/rundinova-studio/cert-status/*.json      # attendu : "state":"issued" pour les 4
# Nettoyage de l'essai (lignées de test, copies) :
for h in isoko admin espace krumbz; do certbot delete --non-interactive --cert-name rs-$h.rundinova.com; \
  rm -rf /etc/rundinova-studio/certs/$h.rundinova.com /etc/rundinova-studio/certs/.v/$h.rundinova.com-*; done
: > /var/lib/rundinova-studio-certs/issued.log

# 2) Émission réelle (4 certificats sur le plafond de 20/semaine) :
for h in isoko admin espace krumbz; do touch /opt/rundinova-studio/cert-requests/$h.rundinova.com; done
PER_RUN_MAX=4 $S/cert-provision.sh
ls -l /etc/rundinova-studio/certs/            # isoko, admin, espace, krumbz → .v/<hôte>-<date>
for h in isoko admin espace krumbz; do openssl x509 -noout -subject -enddate -in /etc/rundinova-studio/certs/$h.rundinova.com/fullchain.pem; done

# 3) Automatique ensuite (nouveaux vendeurs) :
systemctl enable --now rundinova-studio-certs.timer
systemctl list-timers rundinova-studio-certs.timer
```

Le renouvellement passe par le timer certbot existant, qui rappelle notre *deploy hook*
(enregistré dans `/etc/letsencrypt/renewal/rs-*.conf`). Test sans risque : `certbot renew --dry-run --cert-name rs-isoko.rundinova.com`.

## Étape C — Port 443 de la plateforme (UN rechargement)

```bash
bash $S/nginx-safe-apply.sh --expect isoko.rundinova.com --expect admin.rundinova.com --expect espace.rundinova.com -- bash -c "
  set -e
  install -m 644 $SRC/deploy/nginx/sites-available/zz-rundinova-studio-https.conf /etc/nginx/sites-available/
  ln -s /etc/nginx/sites-available/zz-rundinova-studio-https.conf /etc/nginx/sites-enabled/
"
```

**Ordre** : démarrer la production Studio (`docs/ops.md`, « Première mise en service ») **avant**
l'étape C. Sinon isoko/admin/espace répondent 503 (page « indisponible »), `--expect` exige un
code < 500 et le script remet la configuration d'origine (comportement voulu).
Les hôtes de la plateforme encore sans certificat échouent à la poignée de main (avant : certificat
d'un autre site, déjà en erreur dans tout navigateur) : ce n'est pas compté comme régression.

Ordre complet : 0 → 1 → A → B → mise en service de l'app (19300) → C → (plus tard, accord séparé) bascule Krumbz.
`KRUMBZ_SITE` est défini au contrôle C8 (même session shell).

## Vérifications après chaque étape

```bash
grep -h server_name /etc/nginx/sites-enabled/* | sort -u | diff /root/rs-server-names-before.txt - # seulement nos ajouts
bash $S/nginx-safe-apply.sh --dry-run | diff /root/rs-probes-before.txt - # codes identiques pour les autres sites
# Site officiel intact (même contenu qu'avant, servi par SON vhost) :
for h in rundinova.com www.rundinova.com; do
  curl -sS -o /dev/null -w "$h %{http_code} %{ssl_verify_result} " https://$h/; curl -s https://$h/ | grep -o '<title>[^<]*' ; done
# attendu : 200 0 <title>RundiNova Tech – L'Innovation au Cœur de l'Afrique
curl -sI https://isoko.rundinova.com/ | head -3
```

## Bascule de Krumbz (étape 10 du plan, accord séparé)

Pré-requis : sauvegarde complète (`docker tag ghcr.io/jubuniyokodev/krumbz:latest krumbz:pre-cutover`,
`tar czf /root/krumbz-pre-cutover.tgz /opt/krumbz`, sauvegarde Studio `scripts/backup.sh --label pre-cutover`),
production Studio saine (`curl -s -H 'Host: krumbz.rundinova.com' http://127.0.0.1:19300/ -o /dev/null -w '%{http_code}'` → 200).

Bascule (une ligne, un rechargement, retour arrière automatique si un site régresse) :

```bash
bash $S/nginx-safe-apply.sh --expect krumbz.rundinova.com -- sed -i 's#proxy_pass http://127.0.0.1:19200;#proxy_pass http://127.0.0.1:19300;#' "$KRUMBZ_SITE"
```

Retour arrière (une ligne) :

```bash
bash $S/nginx-safe-apply.sh --expect krumbz.rundinova.com -- sed -i 's#proxy_pass http://127.0.0.1:19300;#proxy_pass http://127.0.0.1:19200;#' "$KRUMBZ_SITE"
```

Le conteneur `krumbz` (19200) reste en service pendant au moins une semaine après la bascule ;
son arrêt est une décision séparée. Vérifier la parité (captures Playwright, `docs/ops.md`).
Plus tard (facultatif) : supprimer le vhost krumbz pour que notre bloc serve l'hôte avec le
certificat `rs-krumbz` déjà émis à l'étape B — même procédure `nginx-safe-apply.sh`.

## Retour arrière manuel (si le script lui-même ne pouvait pas le faire)

```bash
ls -t /root/nginx-backups/*.tar.gz | head -3
mv /etc/nginx /etc/nginx.broken-$(date +%s) && tar -C /etc -xzf /root/nginx-backups/nginx-<date>.tar.gz
nginx -t && systemctl reload nginx
```
