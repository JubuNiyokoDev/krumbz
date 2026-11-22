# shellcheck shell=bash
# Rundinova Studio — écriture du fichier d'état <hôte>.json lu par l'app (CERT_STATUS_DIR).
# Sourcé par cert-provision.sh et cert-deploy-hook.sh. Bash + coreutils seulement.
#
# Contrat avec l'app (src/lib/tenant/certs.ts) :
#   { "host", "status": "pending"|"issued"|"error", "expiresAt": ISO|null, "error": texte|null,
#     "state", "message", "updatedAt", "attempts", "nextAttemptAt" }
# « state » détaille l'état côté hôte : pending | queued | issued | external | error | rejected.

json_str() { # chaîne JSON échappée (ou null si vide)
  local s="$1"
  [[ -n "$s" ]] || { printf 'null'; return; }
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="$(printf '%s' "$s" | tr -d '\000-\037')"
  printf '"%s"' "$s"
}

iso_utc() { # <epoch> → AAAA-MM-JJTHH:MM:SSZ
  date -u -d "@$1" +%Y-%m-%dT%H:%M:%SZ
}

# cert_status_write <dossier> <hôte> <state> <message> <expiresAt ISO|""> [attempts] [nextAttempt epoch]
cert_status_write() {
  local dir="$1" host="$2" state="$3" msg="${4:0:500}" exp="$5" att="${6:-0}" next="${7:-}"
  local status err="" next_iso=""
  case "$state" in
    issued|external) status=issued ;;
    error|rejected) status=error; err="$msg" ;;
    *) status=pending ;;
  esac
  [[ -n "$next" ]] && next_iso="$(iso_utc "$next")"
  mkdir -p "$dir"
  local tmp="$dir/.$host.json.tmp"
  printf '{"host":%s,"status":"%s","expiresAt":%s,"error":%s,"state":"%s","message":%s,"updatedAt":"%s","attempts":%d,"nextAttemptAt":%s}\n' \
    "$(json_str "$host")" "$status" "$(json_str "$exp")" "$(json_str "$err")" "$state" \
    "$(json_str "$msg")" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$att" "$(json_str "$next_iso")" >"$tmp"
  chmod 644 "$tmp"
  mv -f "$tmp" "$dir/$host.json"
}
