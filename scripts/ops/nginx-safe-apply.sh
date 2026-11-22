#!/usr/bin/env bash
# Rundinova Studio — appliquer une modification nginx sans risque pour les autres sites du VPS.
#
#   nginx-safe-apply.sh --dry-run                       # sondes seulement (état des sites)
#   nginx-safe-apply.sh [--expect <hôte>]… -- <commande> [args…]
#
# 1. sonde TOUS les sites (`server_name` exacts de sites-enabled/ et conf.d/), en HTTP et HTTPS,
#    directement sur ce serveur (curl --resolve hôte:port:PROBE_IP, sans DNS) ;
# 2. sauvegarde /etc/nginx (tar.gz dans BACKUP_ROOT) ;
# 3. exécute <commande> (ex. copier un fichier, créer un lien, sed d'une ligne) ;
# 4. `nginx -t` — en cas d'échec : restauration, AUCUN rechargement ;
# 5. un seul rechargement (`systemctl reload nginx`), puis nouvelles sondes ;
# 6. si un site qui répondait ne répond plus, passe en 5xx, ou perd un certificat valide
#    (après 2 nouvelles tentatives) — ou si un hôte --expect ne répond pas correctement —
#    restauration de la sauvegarde + rechargement + vérification, code de sortie 1.
#
# Variables : PROBE_IP (127.0.0.1), PROBE_PARALLEL (10), NGINX_DIR (/etc/nginx),
# BACKUP_ROOT (/root/nginx-backups), NGINX_TEST_CMD, NGINX_RELOAD_CMD.
set -Eeuo pipefail

: "${NGINX_DIR:=/etc/nginx}"
: "${BACKUP_ROOT:=/root/nginx-backups}"
: "${PROBE_IP:=127.0.0.1}"
: "${PROBE_PARALLEL:=10}"
: "${PROBE_TIMEOUT:=8}"
: "${NGINX_TEST_CMD:=nginx -t -q}"
: "${NGINX_RELOAD_CMD:=systemctl reload nginx}"
export PROBE_IP PROBE_TIMEOUT

log() { printf '%s [nginx-safe-apply] %s\n' "$(date +%H:%M:%S)" "$*"; }
die() { log "ERREUR: $*" >&2; exit 1; }

dry=0 expects=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) dry=1; shift ;;
    --expect) expects+=("${2:?--expect exige un hôte}"); shift 2 ;;
    --) shift; break ;;
    -h|--help) sed -n '2,21p' "$0"; exit 0 ;;
    *) die "argument inconnu : $1 (la commande se place après --)" ;;
  esac
done
[[ $dry -eq 1 || $# -gt 0 ]] || die "aucune commande (après --) ; --dry-run pour sonder seulement"
[[ $EUID -eq 0 || -n "${ALLOW_NON_ROOT:-}" ]] || die "à lancer en root (sudo)"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
exec 6>"${LOCK_FILE:-/run/lock/nginx-safe-apply.lock}"
flock -n 6 || die "une autre application est en cours"

# Hôtes : noms exacts uniquement (ni joker, ni regex, ni « _ »), dédoublonnés.
list_hosts() {
  cat "$NGINX_DIR"/sites-enabled/* "$NGINX_DIR"/conf.d/*.conf 2>/dev/null \
    | sed 's/#.*//' | tr '\n' ' ' | tr ';{}' '\n' \
    | sed -n 's/^[[:space:]]*server_name[[:space:]]\+//p' | tr -s ' \t' '\n' \
    | grep -E '^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' | tr '[:upper:]' '[:lower:]' | sort -u
}

# Une sonde : « code tls » — tls = ok (certificat valide), bad (invalide), na (HTTP / pas de réponse).
probe_one() {
  local host="$1" scheme="$2" port code
  [[ "$scheme" == https ]] && port=443 || port=80
  code="$(curl -s -o /dev/null -m "$PROBE_TIMEOUT" -w '%{http_code}' --resolve "$host:$port:$PROBE_IP" \
          "$scheme://$host/" 2>/dev/null || true)"
  if [[ "$scheme" == https ]]; then
    if [[ "$code" =~ ^[1-5][0-9][0-9]$ ]]; then echo "$code ok"; return; fi
    code="$(curl -sk -o /dev/null -m "$PROBE_TIMEOUT" -w '%{http_code}' --resolve "$host:$port:$PROBE_IP" \
            "$scheme://$host/" 2>/dev/null || true)"
    [[ "$code" =~ ^[1-5][0-9][0-9]$ ]] && { echo "$code bad"; return; }
    echo "000 na"; return
  fi
  [[ "$code" =~ ^[1-5][0-9][0-9]$ ]] || code=000
  echo "$code na"
}
export -f probe_one

probe_all() { # <fichier-hôtes> <sortie>  →  lignes « hôte schéma code tls »
  # shellcheck disable=SC2016  # $1/$2 développés par le bash enfant (xargs)
  while read -r h; do printf '%s http\n%s https\n' "$h" "$h"; done <"$1" \
    | xargs -r -n 2 -P "$PROBE_PARALLEL" bash -c 'printf "%s %s %s\n" "$1" "$2" "$(probe_one "$1" "$2")"' _ \
    | sort >"$2"
}

# Régressions : avant → après. Écrit les lignes fautives dans $3.
compare() {
  : >"$3"
  join -j1 <(awk '{print $1"|"$2, $3, $4}' "$1" | sort) <(awk '{print $1"|"$2, $3, $4}' "$2" | sort) \
  | while read -r key bc bt ac at; do
      reason=""
      # « bad » avant = l'hôte n'était pas vraiment servi en HTTPS (certificat d'un autre site,
      # erreur dans tout navigateur) : un refus de poignée de main ensuite n'est pas une régression
      # (cas d'un hôte de la plateforme encore sans certificat quand le bloc 443 est activé).
      if [[ "$bc" != 000 && "$ac" == 000 && "$bt" != bad ]]; then reason="ne répond plus"
      elif [[ "$bc" -lt 500 && "$bc" != 000 && "$ac" -ge 500 ]]; then reason="erreur serveur"
      elif [[ "$bt" == ok && "$at" != ok ]]; then reason="certificat invalide"
      fi
      if [[ -n "$reason" ]]; then echo "${key/|/ } avant=$bc/$bt après=$ac/$at : $reason" >>"$3"; fi
    done
  return 0
}

summary() { awk '{c[$3 ~ /^000/ ? "sans réponse" : ($3 >= 500 ? "5xx" : "ok")]++} END {for (k in c) printf "%s=%d ", k, c[k]; print ""}' "$1"; }

list_hosts >"$work/hosts"
[[ -s "$work/hosts" ]] || die "aucun server_name trouvé dans $NGINX_DIR"
log "$(wc -l <"$work/hosts") hôtes trouvés ; sondes initiales (IP $PROBE_IP)…"
probe_all "$work/hosts" "$work/before"
log "avant : $(summary "$work/before")"

if [[ $dry -eq 1 ]]; then
  column -t "$work/before" 2>/dev/null || cat "$work/before"
  exit 0
fi

mkdir -p "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT"
backup="$BACKUP_ROOT/nginx-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -C "$(dirname "$NGINX_DIR")" -czf "$backup" "$(basename "$NGINX_DIR")"
cp "$work/before" "${backup%.tar.gz}.probes-before.txt"
log "sauvegarde : $backup"

restore() {
  log "RESTAURATION de $backup"
  local failed
  failed="$NGINX_DIR.failed-$(date +%Y%m%d-%H%M%S)"
  mv "$NGINX_DIR" "$failed"
  tar -C "$(dirname "$NGINX_DIR")" -xzf "$backup"
  log "configuration fautive gardée pour analyse : $failed"
  if $NGINX_TEST_CMD && $NGINX_RELOAD_CMD; then
    sleep 2
    probe_all "$work/hosts" "$work/restored"
    compare "$work/before" "$work/restored" "$work/still"
    if [[ -s "$work/still" ]]; then
      log "ATTENTION : après restauration, encore des écarts (instabilité de ces sites ?) :"
      sed 's/^/  /' "$work/still"
    else
      log "restauration vérifiée : tous les sites sont revenus à l'état initial"
    fi
  else
    log "ATTENTION : la configuration restaurée ne passe pas nginx -t / reload — intervention manuelle"
  fi
}

log "commande : $*"
if ! "$@"; then
  log "la commande a échoué"
  restore
  exit 1
fi

if ! $NGINX_TEST_CMD; then
  log "nginx -t a échoué : aucun rechargement"
  mv "$NGINX_DIR" "$NGINX_DIR.failed-$(date +%Y%m%d-%H%M%S)"
  tar -C "$(dirname "$NGINX_DIR")" -xzf "$backup"
  $NGINX_TEST_CMD || log "ATTENTION : la sauvegarde restaurée ne passe pas nginx -t"
  log "configuration d'origine remise (nginx n'a jamais été rechargé)"
  exit 1
fi

$NGINX_RELOAD_CMD
sleep 2
probe_all "$work/hosts" "$work/after"
compare "$work/before" "$work/after" "$work/regressions"

# Instabilités passagères : re-sonder les hôtes fautifs avant de décider.
for attempt in 1 2; do
  [[ -s "$work/regressions" ]] || break
  log "écarts détectés, nouvelle sonde ($attempt/2) dans 3 s…"
  sleep 3
  cut -d' ' -f1 "$work/regressions" | sort -u >"$work/retry-hosts"
  probe_all "$work/retry-hosts" "$work/retry"
  awk 'NR==FNR {r[$1]=1; next} !($1 in r)' "$work/retry-hosts" "$work/after" >"$work/after.new"
  cat "$work/retry" >>"$work/after.new"
  sort "$work/after.new" >"$work/after"
  compare "$work/before" "$work/after" "$work/regressions"
done

for h in "${expects[@]}"; do
  r="$(probe_one "$h" https)"
  code="${r% *}"
  if [[ "$code" == 000 || "$code" -ge 500 || "${r#* }" != ok ]]; then
    echo "$h https attendu=2xx-4xx/ok obtenu=$r : hôte attendu en échec" >>"$work/regressions"
  else
    log "hôte attendu ok : $h → $r"
  fi
done

cp "$work/after" "${backup%.tar.gz}.probes-after.txt"
if [[ -s "$work/regressions" ]]; then
  log "RÉGRESSION :"
  sed 's/^/  /' "$work/regressions"
  restore
  exit 1
fi
log "ok : aucun site dégradé ($(summary "$work/after")) ; sauvegarde gardée : $backup"
