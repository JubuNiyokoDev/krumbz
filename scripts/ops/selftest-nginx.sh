#!/usr/bin/env bash
# Test local (poste de développement, jamais le VPS) : configuration nginx de la plateforme,
# nginx-safe-apply.sh et chaîne de certificats (cert-provision.sh + cert-deploy-hook.sh), dans
# un conteneur ubuntu:24.04 + nginx 1.24 (comme le VPS) JETABLE qui imite le VPS (sites-enabled/, autres projets aux noms
# exacts, Krumbz sur 19200, plateforme sur 19300). certbot est simulé : même interface, il
# vérifie le défi HTTP-01 À TRAVERS nginx puis signe avec une CA de test.
#
#   scripts/ops/selftest-nginx.sh                 # image Ubuntu 24.04 + paquet nginx (comme le VPS)
#   SELFTEST_NGINX_IMAGE=nginx:1.24 scripts/ops/selftest-nginx.sh   # sans réseau : image officielle
#   SELFTEST_KEEP_IMAGE=1 …                       # garder l'image construite (relances plus rapides)
#
# Image : rs-selftest-nginx:noble est construite depuis ubuntu:24.04 (apt-get : réseau requis
# PENDANT LE BUILD uniquement). Si le build échoue (pas de DNS/réseau dans le démon Docker),
# repli automatique sur l'image officielle nginx:1.24 (même nginx 1.24.0, base Debian), qui
# contient déjà curl, openssl et bash : le test n'a alors besoin d'aucun téléchargement de paquet.
# Dans les deux cas, le conteneur de test tourne SANS réseau (--network none).
set -Eeuo pipefail
repo="$(cd "$(dirname "$(readlink -f "$0")")/../.." && pwd)"
c="rs-selftest-nginx-$$"
built=""
cleanup() {
  docker rm -f "$c" >/dev/null 2>&1 || true
  if [[ -n "$built" && -z "${SELFTEST_KEEP_IMAGE:-}" ]]; then docker image rm "$built" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

img="${SELFTEST_NGINX_IMAGE:-}"
if [[ -z "$img" ]]; then
  img=rs-selftest-nginx:noble
  if ! docker image inspect "$img" >/dev/null 2>&1; then
    echo "== construction de $img (ubuntu:24.04 + nginx du dépôt Ubuntu)"
    if docker build -q -t "$img" - >/dev/null <<'DOCKERFILE'
FROM ubuntu:24.04
RUN apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends \
      nginx openssl curl ca-certificates && rm -rf /var/lib/apt/lists/* \
 && rm -f /etc/nginx/sites-enabled/default
DOCKERFILE
    then
      built="$img"
    else
      echo "!! construction impossible (réseau/DNS du démon Docker ?) : repli sur nginx:1.24 (officielle)"
      img=nginx:1.24
    fi
  fi
fi
docker image inspect "$img" >/dev/null 2>&1 || docker pull -q "$img" >/dev/null
echo "== image de test : $img"
docker run -d --name "$c" --network none -v "$repo:/repo:ro" --entrypoint sleep "$img" infinity >/dev/null
docker exec -i "$c" bash -s <<'IN'
set -Eeuo pipefail
# Le VPS n'a pas de default_server : ceux des images (Ubuntu : sites-enabled/default,
# officielle : conf.d/default.conf) sont retirés.
rm -f /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf
nginx -v 2>&1
nginx -V 2>&1 | grep -o 'OpenSSL [0-9.]*' | head -n 1
[[ "$(nginx -v 2>&1)" == *"nginx/1.24."* ]] || { echo "ÉCHEC : nginx 1.24 attendu (version du VPS)"; exit 1; }
pass=0
ok() { echo "  ok - $*"; pass=$((pass + 1)); }
fail() { echo "ÉCHEC : $*"; exit 1; }

# --- CA de test, imitation du VPS -------------------------------------------------------
mkdir -p /ca && cd /ca
openssl req -x509 -newkey rsa:2048 -nodes -keyout ca.key -out ca.pem -days 30 -subj /CN=selftest-ca 2>/dev/null
cp ca.pem /usr/local/share/ca-certificates/selftest.crt && update-ca-certificates >/dev/null 2>&1
sign() { # <nom[,nom…]> <dossier>
  mkdir -p "$2"
  openssl req -newkey rsa:2048 -nodes -keyout "$2/privkey.pem" -out "$2/req.csr" -subj "/CN=${1%%,*}" 2>/dev/null
  printf 'subjectAltName=%s\n' "$(echo "$1" | sed 's/^/DNS:/; s/,/,DNS:/g')" >"$2/ext"
  openssl x509 -req -in "$2/req.csr" -CA /ca/ca.pem -CAkey /ca/ca.key -CAcreateserial -days 20 \
    -extfile "$2/ext" -out "$2/fullchain.pem" 2>/dev/null
}
export -f sign

mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /etc/nginx/snippets /etc/nginx/conf.d
cat >/etc/nginx/nginx.conf <<'EOF'
user www-data;
worker_processes 1;
pid /run/nginx.pid;
events { worker_connections 256; }
http {
  include /etc/nginx/mime.types;
  include /etc/nginx/conf.d/*.conf;
  include /etc/nginx/sites-enabled/*;
}
EOF
site() { # <fichier> <noms> <corps de location>
  local f="/etc/nginx/sites-available/$1" first="${2%% *}"
  sign "${2// /,}" "/etc/letsencrypt/live/$first"
  cat >"$f" <<EOF
server { listen 80; server_name $2; return 301 https://\$host\$request_uri; }
server {
  listen 443 ssl; server_name $2;
  ssl_certificate /etc/letsencrypt/live/$first/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$first/privkey.pem;
  location / { $3 }
}
EOF
  ln -s "$f" /etc/nginx/sites-enabled/
}
site aa-official "rundinova.com www.rundinova.com" 'return 200 "official\n";'
site koraneza "koraneza.rundinova.com" 'return 200 "koraneza\n";'
site krumbz "krumbz.rundinova.com" 'proxy_set_header Host $host; proxy_pass http://127.0.0.1:19200;'
cat >/etc/nginx/conf.d/00-backends.conf <<'EOF'
server { listen 127.0.0.1:19200; location / { return 200 "krumbz-old\n"; } }
server { listen 127.0.0.1:19300;
  location / { return 200 "studio host=$host\n"; }
  location /_next/static/ { add_header Cache-Control "public, max-age=31536000, immutable"; return 200 "js\n"; }
  location /uploads/ { add_header Cache-Control "public, max-age=0"; return 200 "img\n"; } }
EOF
nginx -t -q && nginx
sleep 1
for h in rundinova.com www.rundinova.com koraneza.rundinova.com krumbz.rundinova.com; do
  echo "127.0.0.1 $h" >>/etc/hosts
done
for h in isoko admin espace staging-admin foo chat; do echo "127.0.0.1 $h.rundinova.com" >>/etc/hosts; done
get() { curl -s -m 5 "$@"; }
[[ "$(get https://krumbz.rundinova.com/)" == krumbz-old ]] || fail "état initial"
ok "imitation du VPS : 3 vhosts existants servis"

export NGINX_RELOAD_CMD="nginx -s reload" BACKUP_ROOT=/tmp/bk LOCK_FILE=/tmp/nsa.lock
S=/repo/scripts/ops

# --- Étape A : cache + port 80 -----------------------------------------------------------
mkdir -p /var/www/rundinova-studio-acme /var/cache/nginx /etc/rundinova-studio/certs \
         /opt/rundinova-studio/cert-requests /opt/rundinova-studio/cert-status
"$S/nginx-safe-apply.sh" -- bash -c '
  install -m 644 /repo/deploy/nginx/conf.d/rundinova-studio.conf /etc/nginx/conf.d/
  install -m 644 /repo/deploy/nginx/snippets/rundinova-studio-cache.conf /repo/deploy/nginx/snippets/rundinova-studio-acme.conf /etc/nginx/snippets/
  install -m 644 /repo/deploy/nginx/sites-available/zz-rundinova-studio-http.conf /etc/nginx/sites-available/
  ln -s /etc/nginx/sites-available/zz-rundinova-studio-http.conf /etc/nginx/sites-enabled/
  sed -i "/ssl_certificate_key .*krumbz\.rundinova\.com/a\\  include /etc/nginx/snippets/rundinova-studio-acme.conf;" /etc/nginx/sites-available/krumbz
  grep -q rundinova-studio-acme.conf /etc/nginx/sites-available/krumbz' || fail "étape A"
ok "étape A appliquée sans régression (dont le snippet ACME dans le bloc 443 de krumbz)"
[[ "$(get -o /dev/null -w '%{http_code}' http://isoko.rundinova.com/x)" == 301 ]] || fail "redirection port 80"
[[ "$(get -o /dev/null -w '%{http_code}' http://chat.rundinova.com/)" == 421 ]] || fail "garde-fou autres projets"
[[ "$(get https://www.rundinova.com/)" == official && "$(get https://rundinova.com/)" == official ]] || fail "site officiel"
ok "port 80 : redirection, 421 pour un hôte d'un autre projet, rundinova.com/www intacts"

# --- Étape B : certificats isoko/admin/espace via le webroot (certbot simulé) ------------
cat >/usr/local/bin/certbot <<'EOF'
#!/usr/bin/env bash
# certbot simulé : certonly --webroot -w W -d H --cert-name N --deploy-hook K …
while [[ $# -gt 0 ]]; do case "$1" in -w) w="$2"; shift 2;; -d) d="$2"; shift 2;;
  --cert-name) n="$2"; shift 2;; --deploy-hook) k="$2"; shift 2;; *) shift;; esac; done
t="tok$RANDOM"; echo "$t" >"$w/.well-known/acme-challenge/$t"
# Comme Let's Encrypt : suit les redirections (y compris vers HTTPS, certificat non vérifié).
got="$(curl -sLk --max-redirs 3 -m 5 "http://$d/.well-known/acme-challenge/$t")"; rm -f "$w/.well-known/acme-challenge/$t"
[[ "$got" == "$t" ]] || { echo "Error: Invalid response from http://$d (challenge)"; exit 1; }
sign "$d" "/etc/letsencrypt/live/$n" && RENEWED_LINEAGE="/etc/letsencrypt/live/$n" "$k"
EOF
chmod +x /usr/local/bin/certbot
mkdir -p /opt/rundinova-studio/scripts && cp "$S"/cert-deploy-hook.sh "$S"/cert-lib.sh /opt/rundinova-studio/scripts/
for h in isoko admin espace krumbz www a.b Bad_Name; do touch "/opt/rundinova-studio/cert-requests/$h.rundinova.com"; done
SERVER_IPS="" ALLOW_EXTERNAL="" WEEKLY_CAP=2 PER_RUN_MAX=5 "$S/cert-provision.sh"
# <hôte> [champ] : valeur d'un champ texte de <hôte>.json (state par défaut)
st() { sed -n "s/.*\"${2:-state}\":\"\([^\"]*\)\".*/\1/p" "/opt/rundinova-studio/cert-status/$1.json"; }
[[ "$(st admin.rundinova.com)" == issued && "$(st espace.rundinova.com)" == issued ]] || fail "émission"
[[ "$(st admin.rundinova.com status)" == issued && "$(st admin.rundinova.com expiresAt)" == 20* ]] || fail "contrat app (issued + expiresAt)"
[[ "$(st isoko.rundinova.com)" == queued && "$(st isoko.rundinova.com status)" == pending ]] || fail "plafond hebdomadaire (attendu queued/pending)"
[[ "$(st krumbz.rundinova.com)" == external ]] || fail "krumbz devrait être external"
[[ "$(st www.rundinova.com)" == rejected && "$(st www.rundinova.com status)" == error && -n "$(st www.rundinova.com error)" ]] || fail "www devrait être rejected/error"
[[ ! -e /opt/rundinova-studio/cert-status/a.b.rundinova.com.json && ! -e "/opt/rundinova-studio/cert-requests/a.b.rundinova.com" ]] || fail "nom à 2 niveaux"
ok "émission : 2 émis, 3e en file (plafond=2), krumbz external, www rejected, noms invalides ignorés ; JSON au contrat de l'app"
SERVER_IPS="" WEEKLY_CAP=3 "$S/cert-provision.sh"
[[ "$(st isoko.rundinova.com)" == issued ]] || fail "file d'attente non reprise"
[[ "$(stat -c '%a %G' /etc/rundinova-studio/certs/.v/"$(readlink /etc/rundinova-studio/certs/isoko.rundinova.com | cut -d/ -f2)"/privkey.pem)" == "640 www-data" ]] || fail "droits clé"
ok "file d'attente reprise quand le plafond le permet ; clé 0640 root:www-data"
[[ -z "$(ls /opt/rundinova-studio/cert-requests)" ]] || fail "demandes non consommées : $(ls /opt/rundinova-studio/cert-requests)"
ok "toutes les demandes traitées"
# krumbz (servi par SON vhost) : émis via le snippet ACME de son bloc 443 (ALLOW_EXTERNAL par
# défaut), le défi passe par la redirection 80 → 443 ; le site reste servi par l'ancien conteneur.
touch /opt/rundinova-studio/cert-requests/krumbz.rundinova.com
SERVER_IPS="" WEEKLY_CAP=4 "$S/cert-provision.sh"
[[ "$(st krumbz.rundinova.com)" == issued && -r /etc/rundinova-studio/certs/krumbz.rundinova.com/fullchain.pem ]] || fail "émission krumbz"
[[ "$(get https://krumbz.rundinova.com/)" == krumbz-old ]] || fail "krumbz modifié par l'émission"
ok "krumbz : certificat rs-krumbz émis à travers son vhost existant (redirection 80→443), site inchangé"

# --- Étape C : port 443 ------------------------------------------------------------------
printf 'recette:%s\n' "$(openssl passwd -apr1 secret)" >/etc/rundinova-studio/staging.htpasswd
"$S/nginx-safe-apply.sh" --expect isoko.rundinova.com --expect admin.rundinova.com -- bash -c '
  install -m 644 /repo/deploy/nginx/sites-available/zz-rundinova-studio-https.conf /etc/nginx/sites-available/
  ln -s /etc/nginx/sites-available/zz-rundinova-studio-https.conf /etc/nginx/sites-enabled/' || fail "étape C"
ok "étape C appliquée sans régression, hôtes attendus en HTTPS valide"
[[ "$(get https://isoko.rundinova.com/)" == "studio host=isoko.rundinova.com" ]] || fail "proxy + Host"
[[ "$(get https://www.rundinova.com/)" == official && "$(get https://koraneza.rundinova.com/)" == koraneza ]] || fail "autres sites"
[[ "$(get https://krumbz.rundinova.com/)" == krumbz-old ]] || fail "krumbz avant bascule"
ok "HTTPS : plateforme servie avec Host, autres sites et Krumbz inchangés"
get -o /dev/null https://isoko.rundinova.com/_next/static/a.js
[[ "$(get -D - -o /dev/null https://admin.rundinova.com/_next/static/a.js | grep -i x-cache-status | tr -d '\r')" == *HIT ]] || fail "cache"
ok "cache nginx : /_next/static partagé entre hôtes (HIT)"
hdr="$(get -D - -o /dev/null https://isoko.rundinova.com/uploads/krumbz/a.webp | tr -d '\r' | grep -i '^cache-control:')"
[[ "$(grep -ci 'cache-control' <<<"$hdr")" == 1 && "$hdr" == *"max-age=31536000, immutable"* ]] || fail "uploads immutable ($hdr)"
ok "uploads : Cache-Control immutable 1 an (en-tête de l'app remplacé, pas dupliqué)"
# Nouvel hôte APRÈS activation du 443 (cas « nouveau vendeur ») : demande déposée par la stack
# de préproduction, émission, HTTPS servi sans rechargement (mêmes processus workers).
workers() {
  local p
  for p in /proc/[0-9]*; do
    if [[ "$(tr '\0' ' ' <"$p/cmdline" 2>/dev/null || true)" == "nginx: worker"* ]]; then echo "${p#/proc/}"; fi
  done | sort | tr '\n' ' '
}
w_before="$(workers)"
if get -o /dev/null https://staging-admin.rundinova.com/; then fail "staging-admin servi sans certificat"; fi
mkdir -p /opt/rundinova-studio-staging/cert-requests
echo '{"host":"staging-admin.rundinova.com"}' >/opt/rundinova-studio-staging/cert-requests/staging-admin.rundinova.com
SERVER_IPS="" WEEKLY_CAP=10 "$S/cert-provision.sh"
[[ "$(sed -n 's/.*"status":"\([a-z]*\)".*/\1/p' /opt/rundinova-studio-staging/cert-status/staging-admin.rundinova.com.json)" == issued ]] || fail "émission staging"
[[ ! -e /opt/rundinova-studio/cert-status/staging-admin.rundinova.com.json ]] || fail "état écrit dans la mauvaise stack"
[[ "$(get -o /dev/null -w '%{http_code}' https://staging-admin.rundinova.com/)" == 401 ]] || fail "staging sans mot de passe"
[[ "$(workers)" == "$w_before" ]] || fail "nginx a été rechargé (workers $w_before → $(workers))"
ok "nouvel hôte après activation du 443 : émis puis servi en HTTPS valide SANS rechargement (workers inchangés)"
[[ "$(get -u recette:secret -o /dev/null -w '%{http_code}' https://staging-admin.rundinova.com/)" == 503 ]] || fail "staging arrêtée → 503"
ok "préproduction : 401 sans mot de passe, 503 explicite quand arrêtée"
sign "chat.rundinova.com" /tmp/chatcert && mkdir -p /etc/rundinova-studio/certs/chat.rundinova.com && install -m 0640 -g www-data /tmp/chatcert/*.pem /etc/rundinova-studio/certs/chat.rundinova.com/
[[ "$(get -o /dev/null -w '%{http_code}' https://chat.rundinova.com/)" == 421 ]] || fail "421 en https"
if get -o /dev/null https://foo.rundinova.com/; then fail "hôte sans certificat"; fi
ok "hôte sans certificat refusé à la poignée de main ; hôte d'un autre projet → 421"

# Nouveau certificat pris en compte sans rechargement.
before="$(echo | openssl s_client -connect 127.0.0.1:443 -servername isoko.rundinova.com 2>/dev/null | openssl x509 -noout -serial)"
rm -f /opt/rundinova-studio/cert-status/isoko.rundinova.com.json; touch /opt/rundinova-studio/cert-status/isoko.rundinova.com.json
RENEWED_LINEAGE=/etc/letsencrypt/live/rs-isoko.rundinova.com bash -c 'sign isoko.rundinova.com $RENEWED_LINEAGE' && \
  RENEWED_LINEAGE=/etc/letsencrypt/live/rs-isoko.rundinova.com /opt/rundinova-studio/scripts/cert-deploy-hook.sh >/dev/null
after="$(echo | openssl s_client -connect 127.0.0.1:443 -servername isoko.rundinova.com 2>/dev/null | openssl x509 -noout -serial)"
[[ "$before" != "$after" ]] || fail "certificat renouvelé non pris en compte"
ok "renouvellement : nouveau certificat servi sans recharger nginx"

# --- Garde-fous de nginx-safe-apply --------------------------------------------------------
if "$S/nginx-safe-apply.sh" -- sed -i 's#return 200 "koraneza\\n";#proxy_pass http://127.0.0.1:9;#' /etc/nginx/sites-available/koraneza >/tmp/r1 2>&1; then
  fail "régression non détectée"; fi
grep -q "erreur serveur" /tmp/r1 || { cat /tmp/r1; fail "motif de régression"; }
[[ "$(get https://koraneza.rundinova.com/)" == koraneza ]] || fail "retour arrière"
ok "site cassé (502) → retour arrière automatique, site rétabli"
if "$S/nginx-safe-apply.sh" -- bash -c 'echo "server { listen 80; oops }" >/etc/nginx/sites-enabled/broken' >/dev/null 2>&1; then
  fail "erreur de syntaxe acceptée"; fi
[[ ! -e /etc/nginx/sites-enabled/broken ]] && nginx -t -q || fail "restauration après nginx -t"
ok "erreur de syntaxe → nginx -t refuse, configuration d'origine remise sans rechargement"

# --- Bascule Krumbz (une ligne) et retour arrière ------------------------------------------
"$S/nginx-safe-apply.sh" -- sed -i 's#proxy_pass http://127.0.0.1:19200;#proxy_pass http://127.0.0.1:19300;#' /etc/nginx/sites-available/krumbz >/dev/null
[[ "$(get https://krumbz.rundinova.com/)" == "studio host=krumbz.rundinova.com" ]] || fail "bascule"
"$S/nginx-safe-apply.sh" -- sed -i 's#proxy_pass http://127.0.0.1:19300;#proxy_pass http://127.0.0.1:19200;#' /etc/nginx/sites-available/krumbz >/dev/null
[[ "$(get https://krumbz.rundinova.com/)" == krumbz-old ]] || fail "retour arrière bascule"
ok "bascule Krumbz 19200→19300 et retour arrière"
echo "== $pass vérifications nginx réussies"
IN
