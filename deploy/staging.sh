#!/usr/bin/env bash
# Rundinova Studio — préproduction, ARRÊTÉE PAR DÉFAUT (budget mémoire du VPS).
#
#   staging.sh up [tag]     démarre (db → migrations → app), attend « healthy » ; tag par défaut :
#                           celui de release.env, sinon « staging »
#   staging.sh down         arrête et supprime les conteneurs (données conservées sur disque)
#   staging.sh status       état des conteneurs, mémoire, santé
#   staging.sh logs [n]     dernières lignes de l'app (100 par défaut)
#
# Installé sur le VPS : /opt/rundinova-studio-staging/staging.sh (à côté de compose.yml et .env).
# Ne touche QUE le projet compose « rundinova-studio-staging ».
set -Eeuo pipefail

STUDIO_DIR="${STUDIO_DIR:-$(dirname "$(readlink -f "$0")")}"
PROJECT=rundinova-studio-staging
APP=rundinova-studio-staging
cd "$STUDIO_DIR"

log() { printf '%s [staging] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
die() { log "ERREUR: $*" >&2; exit 1; }

[[ -f compose.yml ]] || die "$STUDIO_DIR/compose.yml absent (copie de deploy/compose.staging.yml)"
[[ -f .env ]] || die "$STUDIO_DIR/.env absent (modèle : deploy/env.staging.example, droits 600)"

dc() {
  local envs=(--env-file .env)
  [[ -f release.env ]] && envs+=(--env-file release.env)
  STUDIO_DIR="$STUDIO_DIR" docker compose -p "$PROJECT" -f compose.yml "${envs[@]}" "$@"
}

mem_free_mb() { awk '/^MemAvailable:/ {print int($2 / 1024)}' /proc/meminfo; }

cmd="${1:-status}"
case "$cmd" in
  up)
    if [[ -n "${2:-}" ]]; then
      [[ "$2" =~ ^((staging-)?sha-[0-9a-f]{7,40}|staging|latest)$ ]] || die "tag invalide : $2"
      export TAG="$2"
      printf 'TAG=%s\n' "$2" >release.env
    fi
    free="$(mem_free_mb)"
    # app 512 + db 160 + migrate 256 (ponctuel) : refuser si l'hôte n'a plus de marge.
    (( free >= ${STAGING_MIN_FREE_MB:-900} )) || die "mémoire disponible insuffisante : ${free} Mo (< ${STAGING_MIN_FREE_MB:-900} Mo)"
    for d in db uploads cert-requests cert-status status; do
      [[ -d "$d" ]] || die "$STUDIO_DIR/$d absent (docs/ops.md, « Préproduction »)"
    done
    log "démarrage (mémoire disponible : ${free} Mo)"
    dc pull --quiet
    dc up -d --wait --wait-timeout 180
    log "en service : https://staging-admin.rundinova.com, https://staging-krumbz.rundinova.com …"
    ;;
  down)
    dc down --remove-orphans
    log "arrêtée (données conservées dans $STUDIO_DIR/db et uploads)"
    ;;
  status)
    dc ps -a
    if docker inspect "$APP" >/dev/null 2>&1; then
      docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}' \
        "$APP" "$APP-db" 2>/dev/null || true
      code="$(curl -s -o /dev/null -m 5 -w '%{http_code}' -H 'Host: staging-admin.rundinova.com' \
        http://127.0.0.1:19301/api/health || true)"
      log "GET /api/health → ${code:-000}"
    else
      log "arrêtée (état normal)."
    fi
    ;;
  logs)
    docker logs --tail "${2:-100}" "$APP"
    ;;
  *)
    sed -n '2,10p' "$0"
    exit 2
    ;;
esac
