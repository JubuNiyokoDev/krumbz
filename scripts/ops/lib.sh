# shellcheck shell=bash
# Rundinova Studio — configuration partagée des scripts d'exploitation.
# Sourcé par deploy.sh, backup.sh, restore.sh, health.sh. Ne s'exécute pas seul.
#
# STACK=production (défaut) | staging choisit les valeurs par défaut.
# Chaque variable peut être surchargée par l'environnement (tests locaux).
#
# Garde-fou : ces scripts ne touchent QUE les conteneurs/volumes préfixés
# « rundinova-studio ». Rien d'autre sur le VPS (66 conteneurs d'autres projets).

set -Eeuo pipefail

STACK="${STACK:-production}"
case "$STACK" in
  production)
    : "${STUDIO_DIR:=/opt/rundinova-studio}"
    : "${COMPOSE_PROJECT:=rundinova-studio}"
    : "${APP_CONTAINER:=rundinova-studio}"
    : "${DB_CONTAINER:=rundinova-studio-db}"
    : "${APP_PORT:=19300}"
    ;;
  staging)
    : "${STUDIO_DIR:=/opt/rundinova-studio-staging}"
    : "${COMPOSE_PROJECT:=rundinova-studio-staging}"
    : "${APP_CONTAINER:=rundinova-studio-staging}"
    : "${DB_CONTAINER:=rundinova-studio-staging-db}"
    : "${APP_PORT:=19301}"
    ;;
  *)
    echo "STACK inconnu : $STACK (production|staging)" >&2
    exit 2
    ;;
esac

# Réglages propres à l'hôte (jamais dans le dépôt, jamais dans le .env de l'app) :
# RCLONE_REMOTE, ALERT_WEBHOOK_URL, seuils… Fichier root:root 600, voir docs/ops.md.
: "${OPS_ENV_FILE:=$STUDIO_DIR/ops.env}"
if [[ -r "$OPS_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$OPS_ENV_FILE"
  set +a
fi

# Uploads : dossier de l'hôte monté dans l'app en /data/uploads (compose). Accepte aussi un nom
# de volume Docker (tests). Lu/écrit via un conteneur jetable : même code dans les deux cas.
: "${UPLOADS_VOLUME:=$STUDIO_DIR/uploads}"
: "${DB_USER:=studio}"
: "${DB_NAME:=studio}"
: "${BACKUP_DIR:=$STUDIO_DIR/backups}"
: "${STATUS_DIR:=$STUDIO_DIR/status}"
: "${RETENTION_DAYS:=14}"
# Image utilitaire pour lire/écrire le volume des uploads : déjà présente (service db),
# donc aucun téléchargement supplémentaire sur le VPS.
: "${HELPER_IMAGE:=postgres:16-alpine}"
: "${IMAGE_REPO:=ghcr.io/jubuniyokodev/rundinova-studio}"

log() { printf '%s [%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${0##*/}" "$*"; }
die() { log "ERREUR: $*" >&2; exit 1; }

# docker compose limité à NOTRE projet (fichier, nom de projet et fichiers d'env explicites).
dc() {
  local envs=(--env-file "$STUDIO_DIR/.env")
  [[ -f "$STUDIO_DIR/release.env" ]] && envs+=(--env-file "$STUDIO_DIR/release.env")
  docker compose -p "$COMPOSE_PROJECT" -f "$STUDIO_DIR/compose.yml" "${envs[@]}" "$@"
}

uploads_exists() { # dossier absolu de l'hôte ou volume Docker
  if [[ "$UPLOADS_VOLUME" == /* ]]; then [[ -d "$UPLOADS_VOLUME" ]]
  else docker volume inspect "$UPLOADS_VOLUME" >/dev/null 2>&1
  fi
}

container_running() {
  [[ "$(docker inspect -f '{{.State.Running}}' "$1" 2>/dev/null || true)" == "true" ]]
}

# Lit une variable d'un fichier .env sans l'exécuter (valeurs non fiables pour bash).
env_get() {
  local file="$1" key="$2"
  [[ -r "$file" ]] || return 0
  sed -n "s/^${key}=//p" "$file" | tail -n 1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"
}
