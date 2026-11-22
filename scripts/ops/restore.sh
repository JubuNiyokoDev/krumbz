#!/usr/bin/env bash
# Rundinova Studio — restauration d'une sauvegarde produite par backup.sh.
#
#   restore.sh <dossier-de-sauvegarde> [--into <base>] [--db-only | --uploads-only] [--yes]
#
# Par défaut (restauration complète, avec confirmation) :
#   1. vérifie SHA256SUMS ;
#   2. restaure le dump dans une base NEUVE <base>_restore_<horodatage> (la base en service
#      n'est pas touchée pendant cette étape ; un échec s'arrête ici) ;
#   3. arrête l'application, renomme la base en service en <base>_pre_restore_<horodatage>
#      (CONSERVÉE pour retour arrière), renomme la base neuve en <base> ;
#   4. archive les uploads actuels dans $BACKUP_DIR/pre-restore-<horodatage>/, puis remplace
#      le contenu du volume par celui de la sauvegarde ;
#   5. redémarre l'application.
#
# --into <base>   restaure seulement la base dans <base> (neuve) pour inspection ; ne touche
#                 ni la base en service, ni les uploads, ni l'application.
# --yes           pas de question (scripts) ; sinon il faut taper le nom de la stack.
set -Eeuo pipefail
# shellcheck source=scripts/ops/lib.sh
source "$(dirname "$(readlink -f "$0")")/lib.sh"

: "${UPLOADS_UID:=1001}"
: "${UPLOADS_GID:=1001}"

src="" into="" do_db=1 do_uploads=1 yes=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --into) into="${2:?--into exige un nom de base}"; shift 2 ;;
    --db-only) do_uploads=0; shift ;;
    --uploads-only) do_db=0; shift ;;
    --yes) yes=1; shift ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    -*) die "option inconnue : $1" ;;
    *) src="$1"; shift ;;
  esac
done
[[ -n "$src" ]] || die "usage : restore.sh <dossier-de-sauvegarde> [--into <base>] [--db-only|--uploads-only] [--yes]"
[[ -d "$src" ]] || src="$BACKUP_DIR/$src"
[[ -d "$src" ]] || die "sauvegarde introuvable : $src"
src="$(readlink -f "$src")"
[[ -n "$into" ]] && { do_uploads=0; [[ "$into" =~ ^[a-z_][a-z0-9_]*$ ]] || die "nom de base invalide : $into"; }

log "vérification des sommes de contrôle ($src)"
(cd "$src" && sha256sum -c --quiet SHA256SUMS) || die "SHA256SUMS invalide : sauvegarde corrompue"
[[ $do_db -eq 0 || -s "$src/db.dump" ]] || die "db.dump manquant"
[[ $do_uploads -eq 0 || -s "$src/uploads.tar.gz" ]] || die "uploads.tar.gz manquant"

container_running "$DB_CONTAINER" || die "conteneur $DB_CONTAINER arrêté (démarrer : dc up -d db)"

stamp="$(date -u +%Y%m%d%H%M%S)"
psql_admin() { docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d postgres -Atq "$@"; }
db_exists() { [[ "$(psql_admin -c "SELECT 1 FROM pg_database WHERE datname = '$1'")" == "1" ]]; }

target="${into:-${DB_NAME}_restore_${stamp}}"
if [[ $do_db -eq 1 ]] && db_exists "$target"; then die "la base $target existe déjà"; fi

echo
echo "  Stack           : $STACK"
echo "  Sauvegarde      : $src"
grep -E '^(created_utc|app_image|pg_version)=' "$src/meta.txt" 2>/dev/null | sed 's/^/                    /'
if [[ -n "$into" ]]; then
  echo "  Action          : base restaurée dans « $into » (inspection, rien d'autre ne change)"
else
  [[ $do_db -eq 1 ]] && echo "  Base            : $DB_NAME remplacée (l'actuelle est gardée sous ${DB_NAME}_pre_restore_${stamp})"
  [[ $do_uploads -eq 1 ]] && echo "  Uploads         : volume $UPLOADS_VOLUME remplacé (l'actuel est archivé avant)"
  echo "  Application     : $APP_CONTAINER arrêtée pendant l'opération"
fi
echo
if [[ $yes -ne 1 ]]; then
  [[ -t 0 ]] || die "pas de terminal : relancer avec --yes pour confirmer"
  read -r -p "Tapez « $STACK » pour confirmer : " answer
  [[ "$answer" == "$STACK" ]] || die "annulé"
fi

# --- 1. Base neuve ------------------------------------------------------------------------
if [[ $do_db -eq 1 ]]; then
  log "création de la base neuve $target"
  docker exec "$DB_CONTAINER" createdb -U "$DB_USER" -O "$DB_USER" "$target"
  log "pg_restore → $target"
  if ! docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$target" \
      --no-owner --no-acl --single-transaction --exit-on-error <"$src/db.dump"; then
    psql_admin -c "DROP DATABASE IF EXISTS \"$target\"" || true
    die "pg_restore a échoué ; base en service intacte"
  fi
  tables="$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$target" -Atqc \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')")"
  log "base $target restaurée ($tables tables)"
fi

if [[ -n "$into" ]]; then
  log "terminé (inspection) : docker exec -it $DB_CONTAINER psql -U $DB_USER -d $into"
  log "suppression ensuite : docker exec $DB_CONTAINER dropdb -U $DB_USER $into"
  exit 0
fi

# --- 2. Bascule ----------------------------------------------------------------------------
app_was_running=0
if container_running "$APP_CONTAINER"; then
  app_was_running=1
  log "arrêt de $APP_CONTAINER"
  docker stop -t 20 "$APP_CONTAINER" >/dev/null
fi
restart_app() { [[ $app_was_running -eq 1 ]] && docker start "$APP_CONTAINER" >/dev/null && log "$APP_CONTAINER redémarrée"; }
trap 'log "ÉCHEC : voir les messages ci-dessus"; restart_app || true' ERR

if [[ $do_db -eq 1 ]]; then
  psql_admin -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
                 WHERE datname IN ('$DB_NAME', '$target') AND pid <> pg_backend_pid()" >/dev/null
  if db_exists "$DB_NAME"; then
    psql_admin -c "ALTER DATABASE \"$DB_NAME\" RENAME TO \"${DB_NAME}_pre_restore_${stamp}\""
    log "ancienne base conservée : ${DB_NAME}_pre_restore_${stamp}"
  fi
  psql_admin -c "ALTER DATABASE \"$target\" RENAME TO \"$DB_NAME\""
  log "base $DB_NAME = sauvegarde restaurée"
fi

if [[ $do_uploads -eq 1 ]]; then
  safety="$BACKUP_DIR/pre-restore-$stamp"
  mkdir -p "$safety"
  docker run --rm --network none --memory 128m -v "$UPLOADS_VOLUME:/src:ro" --entrypoint tar \
    "$HELPER_IMAGE" -C /src -czf - . >"$safety/uploads.tar.gz"
  log "uploads actuels archivés : $safety/uploads.tar.gz"
  docker run --rm -i --network none --memory 128m -v "$UPLOADS_VOLUME:/dst" --entrypoint sh \
    "$HELPER_IMAGE" -c "find /dst -mindepth 1 -delete && tar -C /dst -xzf - && chown -R $UPLOADS_UID:$UPLOADS_GID /dst" \
    <"$src/uploads.tar.gz"
  log "uploads restaurés ($(docker run --rm --network none -v "$UPLOADS_VOLUME:/d:ro" --entrypoint sh "$HELPER_IMAGE" -c 'find /d -type f | wc -l') fichiers)"
fi

trap - ERR
restart_app || true
log "restauration terminée."
[[ $do_db -eq 1 ]] && log "retour arrière base : renommer ${DB_NAME}_pre_restore_${stamp} en $DB_NAME (app arrêtée) ; suppression quand tout est vérifié : dropdb ${DB_NAME}_pre_restore_${stamp}"
exit 0
