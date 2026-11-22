#!/usr/bin/env bash
# Test local de bout en bout de backup.sh + restore.sh, sur des conteneurs JETABLES
# (postgres:16-alpine). À lancer sur un poste de développement, jamais sur le VPS.
#
#   scripts/ops/selftest-backup-restore.sh
#
# Scénario : base A remplie + volume d'uploads A (B : dossier lié, comme en production) → backup.sh → (1) restore --into sur A
# (inspection) ; (2) restauration complète sur un « serveur neuf » B (base + uploads + arrêt/
# redémarrage de l'app) ; (3) sauvegarde corrompue refusée. Compare données et fichiers.
set -Eeuo pipefail
here="$(dirname "$(readlink -f "$0")")"
p="rs-selftest-$$"
work="$(mktemp -d)"
pass=0
fail() { echo "ÉCHEC : $*" >&2; exit 1; }
ok() { echo "  ok - $*"; pass=$((pass + 1)); }

cleanup() {
  docker rm -f "$p-db-a" "$p-db-b" "$p-app" >/dev/null 2>&1 || true
  docker volume rm "$p-up-a" >/dev/null 2>&1 || true
  # fichiers 1001/root dans le dossier lié : suppression par un conteneur jetable
  docker run --rm --network none -v "$work:/w" --entrypoint rm postgres:16-alpine -rf /w/up-b >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT

echo "== préparation ($p)"
# A : volume Docker ; B : dossier de l'hôte lié (comme la production : /opt/rundinova-studio/uploads).
docker volume create "$p-up-a" >/dev/null
up_b="$work/up-b"
mkdir -p "$up_b"
for s in a b; do
  docker run -d --name "$p-db-$s" -e POSTGRES_USER=studio -e POSTGRES_PASSWORD=selftest \
    -e POSTGRES_DB=studio --memory 256m postgres:16-alpine >/dev/null
done
docker run -d --name "$p-app" --entrypoint sleep postgres:16-alpine 3600 >/dev/null
for s in a b; do
  for _ in $(seq 60); do docker exec "$p-db-$s" pg_isready -U studio -d studio -q 2>/dev/null && break; sleep 1; done
  # pg_isready répond pendant l'init : attendre le serveur définitif
  for _ in $(seq 60); do docker exec "$p-db-$s" psql -U studio -d studio -Atqc 'select 1' >/dev/null 2>&1 && break; sleep 1; done
done
sleep 2

docker exec -i "$p-db-a" psql -v ON_ERROR_STOP=1 -U studio -d studio -q <<'SQL'
CREATE TABLE tenants (id serial PRIMARY KEY, slug text UNIQUE NOT NULL, theme jsonb, created_at timestamptz DEFAULT now());
CREATE TABLE products (id serial PRIMARY KEY, tenant_id int NOT NULL REFERENCES tenants(id), name jsonb, price numeric(12,2));
CREATE INDEX products_tenant ON products (tenant_id);
INSERT INTO tenants (slug, theme) VALUES ('krumbz', '{"accent":"#c58b3b"}'), ('chaussures', '{"accent":"#222"}');
INSERT INTO products (tenant_id, name, price)
  SELECT 1 + (g % 2), jsonb_build_object('fr', 'Produit ' || g, 'rn', 'Igicuruzwa ' || g), g * 1000
  FROM generate_series(1, 500) g;
SQL
docker run --rm -v "$p-up-a:/d" --entrypoint sh postgres:16-alpine -c \
  'mkdir -p /d/krumbz /d/chaussures/2026 && head -c 300000 /dev/urandom > /d/krumbz/hero.avif &&
   echo "é ü 日本" > "/d/chaussures/2026/nom avec espaces.txt" && chown -R 1001:1001 /d'

digest_db() { docker exec "$1" psql -U studio -d "${2:-studio}" -Atqc \
  "SELECT md5(string_agg(t::text, '|' ORDER BY t::text)) FROM (SELECT tenants::text AS t FROM tenants UNION ALL SELECT products::text FROM products) x"; }
digest_files() { docker run --rm -v "$1:/d:ro" --entrypoint sh postgres:16-alpine -c \
  'cd /d && find . -type f -exec sha256sum {} + | sort && find . -exec stat -c "%n %u:%g" {} + | sort' | sha256sum | cut -d' ' -f1; }
ref_db="$(digest_db "$p-db-a")"
ref_files="$(digest_files "$p-up-a")"

export STUDIO_DIR="$work/studio" BACKUP_DIR="$work/backups" OPS_ENV_FILE=/dev/null
mkdir -p "$STUDIO_DIR"

echo "== backup.sh"
remote=""
# Copie « hors serveur » simulée par un remote rclone local (même chemin de code que R2).
command -v rclone >/dev/null && remote=":local:$work/offsite"
DB_CONTAINER="$p-db-a" UPLOADS_VOLUME="$p-up-a" APP_CONTAINER="$p-app" RCLONE_REMOTE="$remote" \
  "$here/backup.sh" --label selftest
bk="$(cat "$BACKUP_DIR/last-success")"
[[ -s "$BACKUP_DIR/$bk/db.dump" && -s "$BACKUP_DIR/$bk/uploads.tar.gz" ]] || fail "fichiers de sauvegarde absents"
(cd "$BACKUP_DIR/$bk" && sha256sum -c --quiet SHA256SUMS) || fail "SHA256SUMS"
ok "sauvegarde créée : $bk ($(du -sh "$BACKUP_DIR/$bk" | cut -f1))"
if [[ -n "$remote" ]]; then
  (cd "$work/offsite/$bk" && sha256sum -c --quiet SHA256SUMS) || fail "copie hors serveur incomplète"
  ok "copie hors serveur (rclone) complète et vérifiée"
fi
# Rotation : un dossier daté de 20 jours doit disparaître, un récent rester.
mkdir -p "$BACKUP_DIR/20200101T000000Z" && touch -d '20 days ago' "$BACKUP_DIR/20200101T000000Z"
DB_CONTAINER="$p-db-a" UPLOADS_VOLUME="$p-up-a" APP_CONTAINER="$p-app" "$here/backup.sh" >/dev/null
[[ ! -e "$BACKUP_DIR/20200101T000000Z" && -d "$BACKUP_DIR/$bk" ]] || fail "rotation 14 jours"
ok "rotation 14 jours (ancien supprimé, récent conservé)"

echo "== restore.sh --into (inspection, même serveur)"
DB_CONTAINER="$p-db-a" UPLOADS_VOLUME="$p-up-a" APP_CONTAINER="$p-app" "$here/restore.sh" "$bk" --into studio_check --yes
[[ "$(digest_db "$p-db-a" studio_check)" == "$ref_db" ]] || fail "données différentes dans studio_check"
container_state="$(docker inspect -f '{{.State.Running}}' "$p-app")"
[[ "$container_state" == "true" ]] || fail "--into ne doit pas arrêter l'app"
ok "restore --into : données identiques, app non touchée"

echo "== restore.sh complet sur un serveur neuf (B)"
DB_CONTAINER="$p-db-b" UPLOADS_VOLUME="$up_b" APP_CONTAINER="$p-app" "$here/restore.sh" "$BACKUP_DIR/$bk" --yes
[[ "$(digest_db "$p-db-b")" == "$ref_db" ]] || fail "données différentes sur B"
ok "base B identique à A (md5 $ref_db)"
[[ "$(digest_files "$up_b")" == "$ref_files" ]] || fail "uploads différents sur B"
ok "uploads B (dossier lié de l'hôte) identiques à A (contenu + propriétaire 1001)"
docker exec "$p-db-b" psql -U studio -d postgres -Atqc "SELECT datname FROM pg_database WHERE datname LIKE 'studio_pre_restore_%'" | grep -q . \
  || fail "ancienne base non conservée"
ok "ancienne base de B conservée (studio_pre_restore_*)"
[[ "$(docker inspect -f '{{.State.Running}}' "$p-app")" == "true" ]] || fail "app non redémarrée"
ok "application arrêtée puis redémarrée"
next_id="$(docker exec "$p-db-b" psql -U studio -d studio -Atqc "INSERT INTO products (tenant_id, name, price) VALUES (1, '{}', 1) RETURNING id")"
[[ "$next_id" == "501" ]] || fail "séquence non restaurée (id=$next_id)"
ok "séquences restaurées (prochain id = 501)"
DB_CONTAINER="$p-db-b" UPLOADS_VOLUME="$up_b" APP_CONTAINER="$p-app" "$here/backup.sh" --label from-bind >/dev/null
bk2="$(cat "$BACKUP_DIR/last-success")"
[[ "$(tar -tzf "$BACKUP_DIR/$bk2/uploads.tar.gz" | sort)" == "$(tar -tzf "$BACKUP_DIR/$bk/uploads.tar.gz" | sort)" ]] || fail "sauvegarde depuis le dossier lié"
ok "sauvegarde depuis un dossier lié de l'hôte (mode production) : mêmes fichiers"

echo "== sauvegarde corrompue refusée"
cp -r "$BACKUP_DIR/$bk" "$work/corrupt"
printf 'X' | dd of="$work/corrupt/db.dump" bs=1 seek=100 conv=notrunc status=none
if DB_CONTAINER="$p-db-b" UPLOADS_VOLUME="$up_b" APP_CONTAINER="$p-app" "$here/restore.sh" "$work/corrupt" --yes 2>/dev/null; then
  fail "une sauvegarde corrompue a été restaurée"
fi
ok "corruption détectée (SHA256SUMS), rien restauré"

echo "== $pass vérifications réussies"
