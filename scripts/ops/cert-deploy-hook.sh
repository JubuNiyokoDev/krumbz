#!/usr/bin/env bash
# Rundinova Studio — deploy hook certbot (émission ET renouvellements des lignées « rs-<hôte> »).
#
# Appelé par certbot avec RENEWED_LINEAGE=/etc/letsencrypt/live/rs-<hôte>. Copie le certificat
# dans /etc/rundinova-studio/certs/<hôte>/ (lien symbolique remplacé atomiquement → nginx, qui
# charge le certificat à chaque poignée de main, ne voit jamais une paire incohérente), droits
# 0640 root:www-data, puis met à jour l'état JSON lu par la super-admin.
# AUCUN rechargement nginx. Enregistré dans la configuration de renouvellement de chaque
# lignée par cert-provision.sh (--deploy-hook) : le certbot.timer existant s'en sert.
set -Eeuo pipefail

: "${CERTS_DIR:=/etc/rundinova-studio/certs}"
: "${CERT_OWNER:=root}"
: "${CERT_GROUP:=www-data}"
: "${CERT_STATUS_DIRS:=/opt/rundinova-studio/cert-status /opt/rundinova-studio-staging/cert-status}"

log() { printf '%s [cert-deploy-hook] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
# shellcheck source=scripts/ops/cert-lib.sh
source "$(dirname "$(readlink -f "$0")")/cert-lib.sh"

lineage="${RENEWED_LINEAGE:?RENEWED_LINEAGE manquant (à appeler par certbot)}"
name="${lineage##*/}"
if [[ "$name" != rs-* ]]; then
  log "lignée $name ignorée (pas Rundinova Studio)"
  exit 0
fi
host="${name#rs-}"
[[ "$host" =~ ^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.rundinova\.com$ ]] || { log "nom invalide : $host"; exit 1; }

umask 027
install -d -m 0750 -o "$CERT_OWNER" -g "$CERT_GROUP" "$CERTS_DIR" "$CERTS_DIR/.v"
stamp="$(date -u +%Y%m%d%H%M%S)"
ver="$CERTS_DIR/.v/$host-$stamp"
install -d -m 0750 -o "$CERT_OWNER" -g "$CERT_GROUP" "$ver"
install -m 0640 -o "$CERT_OWNER" -g "$CERT_GROUP" "$lineage/fullchain.pem" "$ver/fullchain.pem"
install -m 0640 -o "$CERT_OWNER" -g "$CERT_GROUP" "$lineage/privkey.pem" "$ver/privkey.pem"

# Bascule atomique du lien <hôte> → .v/<hôte>-<horodatage>.
ln -sfn ".v/$host-$stamp" "$CERTS_DIR/.$host.new"
mv -Tf "$CERTS_DIR/.$host.new" "$CERTS_DIR/$host"

# Garder la version courante et la précédente.
find "$CERTS_DIR/.v" -mindepth 1 -maxdepth 1 -type d -name "$host-*" | sort -r | tail -n +3 | xargs -r rm -rf

expires="$(date -u -d "$(openssl x509 -enddate -noout -in "$ver/fullchain.pem" | cut -d= -f2)" +%Y-%m-%dT%H:%M:%SZ)"
log "$host : certificat en place (expire le $expires)"

for d in $CERT_STATUS_DIRS; do
  # Seulement la stack qui a demandé ce certificat (fichier créé par cert-provision.sh).
  [[ -f "$d/$host.json" ]] || continue
  cert_status_write "$d" "$host" issued "Certificat HTTPS actif" "$expires" 0
done
