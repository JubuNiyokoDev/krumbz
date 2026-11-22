#!/usr/bin/env bash
# Rundinova Studio — sauvegarde : base PostgreSQL (pg_dump format custom) + archive des uploads.
#
#   backup.sh [--label <texte>]          # STACK=production par défaut
#   STACK=staging backup.sh
#
# Résultat : $BACKUP_DIR/<AAAAMMJJTHHMMSSZ>[-label]/
#   db.dump           pg_dump -Fc (restaurable avec restore.sh / pg_restore)
#   uploads.tar.gz    contenu du volume des uploads
#   SHA256SUMS        sommes de contrôle (vérifiées par restore.sh)
#   meta.txt          contexte (stack, base, tailles, version PostgreSQL)
# Rotation locale : RETENTION_DAYS jours (14). Copie hors serveur si RCLONE_REMOTE est défini
# (ex. RCLONE_REMOTE=r2:rundinova-studio-backups/production) — voir docs/ops.md.
# Marqueur de succès : $BACKUP_DIR/last-success (lu par health.sh).
set -Eeuo pipefail
# shellcheck source=scripts/ops/lib.sh
source "$(dirname "$(readlink -f "$0")")/lib.sh"

label=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --label) label="${2:?--label exige une valeur}"; shift 2 ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) die "argument inconnu : $1" ;;
  esac
done
[[ -z "$label" || "$label" =~ ^[a-z0-9-]+$ ]] || die "label invalide (a-z, 0-9, -)"

umask 077
mkdir -p "$BACKUP_DIR"

# Une seule sauvegarde à la fois (cron + déploiement).
exec 9>"$BACKUP_DIR/.lock"
flock -w 600 9 || die "une autre sauvegarde est en cours"

container_running "$DB_CONTAINER" || die "conteneur $DB_CONTAINER arrêté"
uploads_exists || die "uploads introuvables : $UPLOADS_VOLUME"

ts="$(date -u +%Y%m%dT%H%M%SZ)"
name="$ts${label:+-$label}"
work="$BACKUP_DIR/.tmp-$name"
dest="$BACKUP_DIR/$name"
rm -rf "$work"
mkdir -p "$work"
trap 'rm -rf "$work"' EXIT

log "sauvegarde $STACK → $dest"

# 1. Base : format custom (compressé, restauration sélective possible).
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc -Z 6 --no-password >"$work/db.dump"
# Vérifie que l'archive est lisible (table des matières) avant de la garder.
docker exec -i "$DB_CONTAINER" pg_restore -l >/dev/null <"$work/db.dump" || die "dump illisible"

# 2. Uploads : volume monté en lecture seule dans un conteneur jetable, sans réseau.
docker run --rm --network none --memory 128m --cpus 0.5 \
  -v "$UPLOADS_VOLUME:/src:ro" --entrypoint tar "$HELPER_IMAGE" \
  -C /src -czf - . >"$work/uploads.tar.gz"
gzip -t "$work/uploads.tar.gz" || die "archive des uploads corrompue"

# 3. Contexte + sommes de contrôle.
{
  echo "stack=$STACK"
  echo "created_utc=$ts"
  echo "db_container=$DB_CONTAINER"
  echo "db_name=$DB_NAME"
  echo "uploads_volume=$UPLOADS_VOLUME"
  echo "pg_version=$(docker exec "$DB_CONTAINER" postgres --version)"
  echo "app_image=$(docker inspect -f '{{.Config.Image}}' "$APP_CONTAINER" 2>/dev/null || echo absent)"
  echo "db_dump_bytes=$(stat -c %s "$work/db.dump")"
  echo "uploads_bytes=$(stat -c %s "$work/uploads.tar.gz")"
} >"$work/meta.txt"
(cd "$work" && sha256sum db.dump uploads.tar.gz >SHA256SUMS)

mv "$work" "$dest"
trap - EXIT
echo "$name" >"$BACKUP_DIR/last-success"
log "ok : $(du -sh "$dest" | cut -f1)"

# 4. Rotation locale (uniquement les dossiers de sauvegarde horodatés).
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '20[0-9][0-9][01][0-9]*T*Z*' \
  -mtime "+$RETENTION_DAYS" -print -exec rm -rf {} + | sed 's/^/supprimé (rotation) : /'

# 5. Copie hors serveur (optionnelle). Un échec n'invalide pas la sauvegarde locale,
#    mais le code de sortie le signale (health.sh / cron).
if [[ -n "${RCLONE_REMOTE:-}" ]]; then
  command -v rclone >/dev/null || die "RCLONE_REMOTE défini mais rclone absent"
  log "copie hors serveur → $RCLONE_REMOTE/$name"
  if rclone copy --no-traverse --s3-no-check-bucket "$dest" "$RCLONE_REMOTE/$name"; then
    echo "$name" >"$BACKUP_DIR/last-offsite-success"
    log "copie hors serveur ok (la durée de conservation distante est gérée par la règle de cycle de vie du bucket)"
  else
    die "copie hors serveur échouée (sauvegarde locale conservée : $dest)"
  fi
fi
