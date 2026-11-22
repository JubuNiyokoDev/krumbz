#!/usr/bin/env bash
# Rundinova Studio — émission automatique des certificats HTTPS (Let's Encrypt HTTP-01).
#
# Lancé chaque minute en root par rundinova-studio-certs.timer (deploy/systemd/).
# L'app (conteneur sans privilège) dépose un fichier nommé d'après l'hôte dans
#   /opt/rundinova-studio/cert-requests/<hôte>         (préproduction : …-staging/cert-requests)
# (contenu ignoré : seul le NOM compte) et lit l'état dans
#   /opt/rundinova-studio/cert-status/<hôte>.json      (monté en lecture seule : /data/cert-status)
#   { "host", "status": pending|issued|error, "expiresAt", "error", "state", "message", … }
#   state (détail) : pending | queued | issued | external | error | rejected — voir cert-lib.sh
#
# Garde-fous, dans l'ordre : nom valide (un seul niveau sous rundinova.com) et non réservé ;
# hôte déjà servi par un AUTRE vhost (nom exact) → « external », rien n'est émis ; certificat
# déjà valide → « issued » ; DNS → ce serveur ; auto-test du webroot par le port 80 (évite de
# consommer les échecs Let's Encrypt) ; recul exponentiel après échec ; plafond de
# WEEKLY_CAP émissions / 7 jours (la limite Let's Encrypt de 50 certificats/semaine est
# PARTAGÉE avec tous les projets de rundinova.com) → « queued » au-delà ; PER_RUN_MAX par passage.
#
# ALLOW_EXTERNAL : hôtes de NOTRE projet servis par leur propre vhost (krumbz.rundinova.com avant
# son passage dans le bloc de la plateforme) pour lesquels on émet quand même « rs-<hôte> ». Leur
# vhost 443 doit inclure snippets/rundinova-studio-acme.conf (le port 80 de certbot redirige
# vers HTTPS ; Let's Encrypt suit la redirection). Voir deploy/nginx/APPLY.md, étape B.
set -Eeuo pipefail

: "${REQUEST_DIRS:=/opt/rundinova-studio/cert-requests /opt/rundinova-studio-staging/cert-requests}"
: "${WEBROOT:=/var/www/rundinova-studio-acme}"
: "${CERTS_DIR:=/etc/rundinova-studio/certs}"
: "${STATE_DIR:=/var/lib/rundinova-studio-certs}"
: "${NGINX_SITES:=/etc/nginx/sites-enabled}"
: "${DEPLOY_HOOK:=/opt/rundinova-studio/scripts/cert-deploy-hook.sh}"
: "${CERTBOT:=certbot}"
: "${CERTBOT_EXTRA:=}"            # ex. « --test-cert » pour essayer sur l'environnement de test LE
: "${LE_EMAIL:=}"
: "${WEEKLY_CAP:=20}"
: "${PER_RUN_MAX:=3}"
: "${RENEW_BEFORE_DAYS:=30}"
: "${SERVER_IPS=31.97.33.141}"    # défini mais vide = pas de contrôle DNS
: "${PROBE_IP:=127.0.0.1}"
: "${ALLOW_EXTERNAL=krumbz.rundinova.com}"   # défini mais vide = aucun
# Libellés jamais émis : hôtes des autres projets du VPS et noms réservés (src/lib/tenant/types.ts).
# admin, espace, isoko, staging* sont ceux de la plateforme : autorisés.
: "${RESERVED_LABELS:=www mail api app static assets cdn storage s3 chat livekit livekit-admin workspace koraneza tableyawe tableyawe-api shopsync games realtime central rundinova tech}"

log() { printf '%s [cert-provision] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
# shellcheck source=scripts/ops/cert-lib.sh
source "$(dirname "$(readlink -f "$0")")/cert-lib.sh"

mkdir -p "$STATE_DIR" "$WEBROOT/.well-known/acme-challenge"
chmod 700 "$STATE_DIR"
exec 5>"$STATE_DIR/.lock"
flock -n 5 || exit 0
ledger="$STATE_DIR/issued.log"   # « epoch hôte » par émission NOUVELLE (pas les renouvellements)
touch "$ledger"

# write_status <dossier> <hôte> <state> <message> [attempts] [nextAttemptAt epoch]
write_status() {
  cert_status_write "$1" "$2" "$3" "$4" "$(cert_expiry "$2")" "${5:-0}" "${6:-}"
}

cert_expiry() { # date ISO d'expiration du certificat en place, vide sinon
  local f="$CERTS_DIR/$1/fullchain.pem"
  [[ -r "$f" ]] || return 0
  date -u -d "$(openssl x509 -enddate -noout -in "$f" | cut -d= -f2)" +%Y-%m-%dT%H:%M:%SZ
}

cert_valid_days() { # jours de validité restants du certificat en place (-1 si absent)
  local f="$CERTS_DIR/$1/fullchain.pem" end
  [[ -r "$f" ]] || { echo -1; return; }
  end="$(date -u -d "$(openssl x509 -enddate -noout -in "$f" | cut -d= -f2)" +%s)"
  echo $(( (end - $(date +%s)) / 86400 ))
}

served_elsewhere() { # le nom exact figure dans un vhost qui n'est pas le nôtre
  local host="$1" f
  for f in "$NGINX_SITES"/*; do
    [[ -e "$f" ]] || continue
    case "${f##*/}" in zz-rundinova-studio*) continue ;; esac
    sed 's/#.*//' "$f" | tr '\n' ' ' | tr ';{}' '\n' \
      | sed -n 's/^[[:space:]]*server_name[[:space:]]\+//p' | tr -s ' \t' '\n' \
      | grep -qxiF "$host" && return 0
  done
  return 1
}

webroot_selftest() { # le port 80 de CE serveur sert-il notre webroot pour cet hôte ?
  local host="$1" token body
  token="rs-selftest-$RANDOM$RANDOM"
  echo "$token" >"$WEBROOT/.well-known/acme-challenge/$token"
  chmod 644 "$WEBROOT/.well-known/acme-challenge/$token"
  # Comme Let's Encrypt : suit une redirection vers HTTPS (validité du certificat ignorée).
  body="$(curl -sLk --max-redirs 3 -m 5 --resolve "$host:80:$PROBE_IP" --resolve "$host:443:$PROBE_IP" \
    "http://$host/.well-known/acme-challenge/$token" || true)"
  rm -f "$WEBROOT/.well-known/acme-challenge/$token"
  [[ "$body" == "$token" ]]
}

dns_ok() {
  [[ -z "$SERVER_IPS" ]] && return 0
  local ips ip
  ips="$(getent ahostsv4 "$1" | awk '{print $1}' | sort -u)"
  for ip in $ips; do [[ " $SERVER_IPS " == *" $ip "* ]] && return 0; done
  return 1
}

backoff_seconds() { # 15 min, 1 h, 6 h, puis 24 h
  case "$1" in 1) echo 900 ;; 2) echo 3600 ;; 3) echo 21600 ;; *) echo 86400 ;; esac
}

week_count() { awk -v t="$(( $(date +%s) - 7 * 86400 ))" '$1 >= t' "$ledger" | wc -l; }

issued_this_run=0
for req_dir in $REQUEST_DIRS; do
  [[ -d "$req_dir" ]] || continue
  status_dir="$(dirname "$req_dir")/cert-status"
  while read -r host; do
    [[ -n "$host" ]] || continue
    req="$req_dir/$host"
    host_lc="${host,,}"

    # 1. Nom.
    if [[ ! "$host_lc" =~ ^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.rundinova\.com$ ]]; then
      log "rejeté (nom invalide) : $host"
      rm -f -- "$req"
      continue   # pas d'état : le nom n'est pas sûr comme nom de fichier
    fi
    label="${host_lc%%.*}"
    if [[ " $RESERVED_LABELS " == *" $label "* ]]; then
      write_status "$status_dir" "$host_lc" rejected "Nom réservé (autre projet ou usage interne)"
      rm -f -- "$req"; log "rejeté (réservé) : $host_lc"; continue
    fi

    # 2. Déjà servi par un autre vhost (ex. krumbz.rundinova.com avant/après bascule) : son
    #    certificat est géré par sa propre configuration certbot.
    if [[ " $ALLOW_EXTERNAL " != *" $host_lc "* ]] && served_elsewhere "$host_lc"; then
      write_status "$status_dir" "$host_lc" external "Servi par un vhost existant avec son propre certificat"
      rm -f -- "$req"; log "externe : $host_lc"; continue
    fi

    # 3. Certificat déjà en place et valide.
    if (( $(cert_valid_days "$host_lc") > RENEW_BEFORE_DAYS )); then
      write_status "$status_dir" "$host_lc" issued "Certificat HTTPS actif"
      rm -f -- "$req"; continue
    fi
    # Lignée certbot existante mais copie absente (réparation) : relancer le hook.
    if [[ -r "/etc/letsencrypt/live/rs-$host_lc/fullchain.pem" ]] && [[ ! -e "$CERTS_DIR/$host_lc" ]]; then
      write_status "$status_dir" "$host_lc" pending "Réinstallation du certificat existant"
      RENEWED_LINEAGE="/etc/letsencrypt/live/rs-$host_lc" "$DEPLOY_HOOK" && { rm -f -- "$req"; continue; }
    fi

    # 4. Recul après échec.
    state="$STATE_DIR/$host_lc.attempts"
    attempts=0 next=0
    [[ -r "$state" ]] && read -r attempts next <"$state"
    if (( next > $(date +%s) )); then continue; fi

    # 5. Plafonds.
    if (( issued_this_run >= PER_RUN_MAX )); then continue; fi
    if (( $(week_count) >= WEEKLY_CAP )); then
      write_status "$status_dir" "$host_lc" queued \
        "En file d'attente : plafond de $WEEKLY_CAP certificats / 7 jours atteint (limite Let's Encrypt partagée par tout rundinova.com)"
      log "en file (plafond hebdomadaire) : $host_lc"; continue
    fi

    # 6. Pré-contrôles locaux (ne consomment aucune limite Let's Encrypt).
    fail_msg=""
    if ! dns_ok "$host_lc"; then
      fail_msg="Le DNS de $host_lc ne pointe pas vers ce serveur"
    elif ! webroot_selftest "$host_lc"; then
      fail_msg="Le port 80 ne sert pas le dossier ACME pour $host_lc (bloc zz-rundinova-studio-http absent, ou snippet rundinova-studio-acme.conf absent du vhost existant ?)"
    fi

    # 7. Émission.
    if [[ -z "$fail_msg" ]]; then
      write_status "$status_dir" "$host_lc" pending "Émission en cours" "$attempts"
      log "émission : $host_lc"
      email_args=(--register-unsafely-without-email)
      [[ -n "$LE_EMAIL" ]] && email_args=(--email "$LE_EMAIL")
      # shellcheck disable=SC2086
      if out="$("$CERTBOT" certonly --webroot -w "$WEBROOT" -d "$host_lc" --cert-name "rs-$host_lc" \
            --non-interactive --agree-tos "${email_args[@]}" --keep-until-expiring \
            --deploy-hook "$DEPLOY_HOOK" $CERTBOT_EXTRA 2>&1)"; then
        if [[ -e "$CERTS_DIR/$host_lc/fullchain.pem" ]]; then
          echo "$(date +%s) $host_lc" >>"$ledger"
          issued_this_run=$((issued_this_run + 1))
          rm -f -- "$state" "$req"
          write_status "$status_dir" "$host_lc" issued "Certificat HTTPS actif"
          log "émis : $host_lc"
          continue
        fi
        fail_msg="certbot a réussi mais le certificat n'a pas été copié (deploy hook)"
      else
        fail_msg="certbot : $(printf '%s' "$out" | grep -iE 'error|detail|problem' | tail -n 3 | tr '\n' ' ')"
        [[ -n "${fail_msg#certbot : }" ]] || fail_msg="certbot : $(printf '%s' "$out" | tail -n 2 | tr '\n' ' ')"
      fi
    fi

    attempts=$((attempts + 1))
    next=$(( $(date +%s) + $(backoff_seconds "$attempts") ))
    echo "$attempts $next" >"$state"
    write_status "$status_dir" "$host_lc" error "$fail_msg" "$attempts" "$next"
    log "échec ($attempts) : $host_lc — $fail_msg"
  done < <(find "$req_dir" -mindepth 1 -maxdepth 1 -type f -printf '%f\n' | sort)
done
