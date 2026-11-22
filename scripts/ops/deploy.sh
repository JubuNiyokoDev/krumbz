#!/usr/bin/env bash
# Rundinova Studio — déploiement (et retour arrière) d'une version de l'image.
#
#   deploy.sh <production|staging> <tag>        ex. deploy.sh production sha-1a2b3c4
#
# Retour arrière = redéployer un tag précédent : deploy.sh production <ancien sha>
# (liste : cat /opt/rundinova-studio/releases.log). Les migrations ne se défont pas :
# elles doivent rester compatibles avec la version précédente (ajouter avant de retirer).
#
# Étapes : pull → base démarrée → sauvegarde pré-déploiement (production) → migrations →
# app redémarrée → attente « healthy » → sinon remise automatique du tag précédent.
# Ne touche qu'au projet compose rundinova-studio[-staging].
set -Eeuo pipefail
STACK="${1:-}"
tag="${2:-}"
export STACK
# shellcheck source=scripts/ops/lib.sh
source "$(dirname "$(readlink -f "$0")")/lib.sh"

[[ "$tag" =~ ^((staging-)?sha-[0-9a-f]{7,40}|latest|staging|v[0-9][0-9.]*)$ ]] || die "tag invalide : '$tag' (attendu sha-xxxxxxx ou staging-sha-xxxxxxx)"
cd "$STUDIO_DIR"
[[ -f compose.yml ]] || die "$STUDIO_DIR/compose.yml absent"
[[ -f .env ]] || die "$STUDIO_DIR/.env absent : le créer à partir de .env.example (droits 600), voir docs/ops.md"
chmod 600 .env
for d in db uploads cert-requests cert-status status; do
  [[ -d "$d" ]] || die "$STUDIO_DIR/$d absent : créer les dossiers (docs/ops.md, « Première installation »)"
done

exec 8>"$STUDIO_DIR/.deploy.lock"
flock -w 300 8 || die "un autre déploiement est en cours"

prev="$(env_get release.env TAG)"
log "déploiement $STACK : ${prev:-<aucun>} → $tag"
export TAG="$tag"   # l'environnement du shell est prioritaire sur release.env

dc pull --quiet db migrate app
dc up -d --wait --wait-timeout 120 db

if [[ "$STACK" == production && -n "$prev" ]]; then
  log "sauvegarde pré-déploiement"
  "$STUDIO_DIR/scripts/backup.sh" --label "pre-deploy-${tag#sha-}" || die "sauvegarde pré-déploiement échouée : déploiement annulé"
fi

log "migrations"
dc run --rm --no-deps migrate || die "migrations échouées : version $prev toujours en service"

log "redémarrage de l'application"
dc up -d --no-deps app

wait_healthy() {
  local state=""
  for _ in $(seq 60); do
    state="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$APP_CONTAINER" 2>/dev/null || echo absent)"
    [[ "$state" == healthy ]] && return 0
    [[ "$state" == unhealthy || "$state" == exited ]] && break
    sleep 3
  done
  log "état de $APP_CONTAINER : $state"
  return 1
}

if ! wait_healthy; then
  docker logs --tail 50 "$APP_CONTAINER" 2>&1 | sed 's/^/  | /' || true
  if [[ -n "$prev" ]]; then
    log "RETOUR ARRIÈRE automatique → $prev"
    TAG="$prev" dc up -d --no-deps app
    if wait_healthy; then log "version $prev rétablie"; else log "ATTENTION : $prev ne répond pas non plus"; fi
  fi
  die "la version $tag n'est pas saine"
fi

printf 'TAG=%s\n' "$tag" >release.env
printf '%s %s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$tag" "${GITHUB_SHA:-manuel}" >>releases.log
log "ok : $tag en service ($(docker inspect -f '{{.Config.Image}}' "$APP_CONTAINER"))"

# Ménage : uniquement NOS images, en gardant la version courante, la précédente et les
# 3 plus récentes (retour arrière sans téléchargement). Une image utilisée n'est pas supprimée.
keep=3
own='^sha-'
if [[ "$STACK" == staging ]]; then own='^staging-sha-'; fi
docker image ls "$IMAGE_REPO" --format '{{.Tag}}' | { grep -E "$own" || true; } | while read -r t; do
  [[ "$t" == "$tag" || "$t" == "$prev" ]] && continue
  if ((keep > 0)); then keep=$((keep - 1)); continue; fi
  docker image rm "$IMAGE_REPO:$t" >/dev/null 2>&1 && log "image supprimée : $t" || true
done
