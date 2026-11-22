#!/usr/bin/env bash
# Rundinova Studio — surveillance (cron toutes les 5 min, voir deploy/cron/rundinova-studio).
#
# Vérifie : mémoire/swap/charge de l'hôte, disque, NOS conteneurs uniquement (préfixe
# rundinova-studio : état, santé, docker stats), chaque boutique listée par l'app
# (GET /api/health/shops) en direct sur l'origine ET par l'URL publique, âge de la
# dernière sauvegarde. Écrit $STATUS_DIR/health.json (lu par la page « Santé » du
# super-admin, montée en lecture seule dans le conteneur : /data/status/health.json).
#
# Code de sortie : 0 ok, 1 warn, 2 critical. Alerte (optionnelle) sur changement d'état :
# ALERT_WEBHOOK_URL dans ops.env (POST JSON {"text","content","status"}).
# Format du JSON et contrat de /api/health/shops : docs/ops.md § Surveillance.
set -Eeuo pipefail
# shellcheck source=scripts/ops/lib.sh
source "$(dirname "$(readlink -f "$0")")/lib.sh"

: "${MEM_WARN_MB:=800}"            # MemAvailable de l'hôte
: "${MEM_CRIT_MB:=400}"
: "${DISK_WARN_PCT:=85}"
: "${DISK_CRIT_PCT:=92}"
: "${DISK_PATHS:=/ /var/lib/docker $STUDIO_DIR}"
: "${CONTAINER_MEM_WARN_PCT:=90}"  # % de mem_limit du conteneur
: "${BACKUP_MAX_AGE_H:=26}"
: "${SHOPS_URL:=http://127.0.0.1:$APP_PORT/api/health/shops}"
: "${SHOPS_HOST:=admin.rundinova.com}"
: "${CHECK_PUBLIC:=1}"
: "${HTTP_TIMEOUT:=10}"
: "${STATUS_FILE:=$STATUS_DIR/health.json}"
: "${HEALTH_TOKEN:=$(env_get "$STUDIO_DIR/.env" HEALTH_TOKEN)}"
export HTTP_TIMEOUT APP_PORT

command -v python3 >/dev/null || die "python3 requis"
mkdir -p "$STATUS_DIR"
exec 7>"$STATUS_DIR/.health.lock"
flock -n 7 || { log "contrôle précédent encore en cours"; exit 0; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# --- Hôte ------------------------------------------------------------------------------
cp /proc/meminfo "$tmp/meminfo"
cut -d' ' -f1-3 /proc/loadavg >"$tmp/loadavg"
nproc >"$tmp/nproc"
for p in $DISK_PATHS; do
  [[ -e "$p" ]] && df -P "$p" | awk 'NR==2 {gsub("%","",$5); print $6 "\t" $5 "\t" int($4/1024)}'
done | sort -u >"$tmp/disk"

# --- Nos conteneurs (et seulement eux) ----------------------------------------------------
docker ps -a --filter "name=^$APP_CONTAINER" --format '{{.Names}}' | sort \
  | { if [[ "$STACK" == production ]]; then grep -v '^rundinova-studio-staging' || true; else cat; fi; } >"$tmp/names" || true
: >"$tmp/containers"
: >"$tmp/stats"
while read -r n; do
  [[ -n "$n" ]] || continue
  docker inspect -f '{{.Name}}	{{.State.Status}}	{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}	{{.HostConfig.Memory}}	{{.RestartCount}}	{{.Config.Image}}' "$n" \
    | sed 's#^/##' >>"$tmp/containers"
done <"$tmp/names"
running="$(docker ps --format '{{.Names}}' | grep -xF -f "$tmp/names" || true)"
if [[ -n "$running" ]]; then
  # shellcheck disable=SC2086
  docker stats --no-stream --format '{{.Name}}	{{.MemUsage}}	{{.CPUPerc}}' $running >"$tmp/stats" || true
fi

# --- Application : GET /api/health → 200 {"ok":true,"db":true} ------------------------------
app_out="$(curl -s -m "$HTTP_TIMEOUT" -o "$tmp/app.json" -w '%{http_code} %{time_total}' -H "Host: $SHOPS_HOST" \
  "http://127.0.0.1:$APP_PORT/api/health" 2>/dev/null || true)"
echo "${app_out:-000 0}" >"$tmp/app"
[[ -f "$tmp/app.json" ]] || : >"$tmp/app.json"

# --- Boutiques ------------------------------------------------------------------------
shops_err=""
if curl -fsS -m "$HTTP_TIMEOUT" -H "Host: $SHOPS_HOST" ${HEALTH_TOKEN:+-H "Authorization: Bearer $HEALTH_TOKEN"} \
    "$SHOPS_URL" -o "$tmp/shops.json" 2>"$tmp/shops.err"; then
  python3 -I - "$tmp/shops.json" >"$tmp/shops.tsv" <<'PY' || shops_err="réponse /api/health/shops invalide"
import json, re, sys
data = json.load(open(sys.argv[1]))
for s in data.get("shops", []):
    host = str(s.get("host", ""))
    if not re.fullmatch(r"[a-z0-9.-]+", host):
        continue
    path = str(s.get("path") or "/")
    if not path.startswith("/"):
        path = "/"
    print("\t".join([str(s.get("slug", "")), host, str(s.get("status", "active")), path]))
PY
else
  shops_err="liste des boutiques indisponible : $(head -c 200 "$tmp/shops.err" | tr -d '\n')"
  : >"$tmp/shops.tsv"
fi

# shellcheck disable=SC2329  # appelée via xargs bash -c (export -f)
check_one() { # slug host status path → slug  origin_code origin_s  public_code public_s
  local slug="$1" host="$2" path="$4" o p="- 0"
  o="$(curl -s -o /dev/null -m "$HTTP_TIMEOUT" -w '%{http_code} %{time_total}' -H "Host: $host" \
       "http://127.0.0.1:$APP_PORT$path" 2>/dev/null || true)"
  if [[ "${CHECK_PUBLIC}" == 1 ]]; then
    p="$(curl -s -o /dev/null -m "$HTTP_TIMEOUT" -w '%{http_code} %{time_total}' "https://$host$path" 2>/dev/null || true)"
  fi
  printf '%s\t%s\t%s\n' "$slug" "${o:-000 0}" "${p:-000 0}"
}
export -f check_one
export CHECK_PUBLIC
# 8 vérifications en parallèle au plus.
tr '\t' '\n' <"$tmp/shops.tsv" | xargs -r -d '\n' -n 4 -P 8 bash -c 'check_one "$@"' _ >"$tmp/checks" || true

# --- Sauvegarde ---------------------------------------------------------------------------
backup_age_h=-1
if [[ -f "$BACKUP_DIR/last-success" ]]; then
  backup_age_h=$(( ($(date +%s) - $(stat -c %Y "$BACKUP_DIR/last-success")) / 3600 ))
fi
echo "$backup_age_h" >"$tmp/backup_age"

# --- Assemblage + seuils ----------------------------------------------------------------------
export MEM_WARN_MB MEM_CRIT_MB DISK_WARN_PCT DISK_CRIT_PCT CONTAINER_MEM_WARN_PCT BACKUP_MAX_AGE_H STACK
export SHOPS_ERR="$shops_err"
python3 -I - "$tmp" >"$tmp/health.json" <<'PY'
import datetime, json, os, re, sys
d = sys.argv[1]
env = os.environ
rd = lambda n: open(os.path.join(d, n)).read()
lines = lambda n: [l.rstrip("\n").split("\t") for l in rd(n).splitlines() if l.strip()]
alerts, level = [], 0
def flag(lvl, msg):
    global level
    level = max(level, lvl)
    alerts.append({"level": ["ok", "warn", "critical"][lvl], "message": msg})

mem = {k: int(v.split()[0]) for k, v in (l.split(":", 1) for l in rd("meminfo").splitlines())}
avail = mem["MemAvailable"] // 1024
swap_total, swap_free = mem.get("SwapTotal", 0), mem.get("SwapFree", 0)
swap_pct = round(100 * (swap_total - swap_free) / swap_total, 1) if swap_total else 0
if avail < int(env["MEM_CRIT_MB"]): flag(2, f"mémoire disponible de l'hôte : {avail} Mo")
elif avail < int(env["MEM_WARN_MB"]): flag(1, f"mémoire disponible de l'hôte : {avail} Mo")
load = [float(x) for x in rd("loadavg").split()]

disks = []
for mount, pct, free_mb in lines("disk"):
    pct = int(pct)
    disks.append({"mount": mount, "usedPct": pct, "freeMb": int(free_mb)})
    if pct >= int(env["DISK_CRIT_PCT"]): flag(2, f"disque {mount} plein à {pct} %")
    elif pct >= int(env["DISK_WARN_PCT"]): flag(1, f"disque {mount} plein à {pct} %")

def to_mb(s):
    m = re.match(r"([\d.]+)\s*([KMGT]?i?B)", s.strip())
    if not m: return None
    f = {"B": 1 / 2**20, "KiB": 1 / 1024, "MiB": 1, "GiB": 1024, "TiB": 2**20, "kB": 1 / 1024, "MB": 1, "GB": 1024}
    return round(float(m.group(1)) * f.get(m.group(2), 1), 1)
stats = {r[0]: r for r in lines("stats")}
containers = []
for name, state, health, limit, restarts, image in lines("containers"):
    c = {"name": name, "state": state, "health": health, "image": image, "restarts": int(restarts),
         "memLimitMb": int(limit) // 2**20 or None, "memUsedMb": None, "memPct": None, "cpuPct": None}
    if name in stats:
        _, usage, cpu = stats[name]
        c["memUsedMb"] = to_mb(usage.split("/")[0])
        c["cpuPct"] = float(cpu.rstrip("%") or 0)
        if c["memLimitMb"] and c["memUsedMb"] is not None:
            c["memPct"] = round(100 * c["memUsedMb"] / c["memLimitMb"], 1)
    containers.append(c)
    one_shot = name.endswith("-migrate") or "-migrate-" in name
    if one_shot: continue
    if state != "running": flag(2, f"conteneur {name} : {state}")
    elif health == "unhealthy": flag(2, f"conteneur {name} : unhealthy")
    elif c["memPct"] and c["memPct"] >= int(env["CONTAINER_MEM_WARN_PCT"]):
        flag(1, f"conteneur {name} : {c['memPct']} % de sa limite mémoire")
if env["STACK"] == "production" and not any(c["name"] == "rundinova-studio" for c in containers):
    flag(1, "conteneur rundinova-studio absent")

ac, at = (rd("app").split() + ["0"])[:2]
try:
    body = json.loads(rd("app.json") or "{}")
except ValueError:
    body = {}
app = {"code": int(ac) if ac.isdigit() else 0, "ms": round(float(at or 0) * 1000),
       "ok": body.get("ok") is True, "db": body.get("db") is True}
if app["code"] != 200 or not app["ok"]:
    flag(2, f"application : /api/health en échec (HTTP {app['code']})")
elif not app["db"]:
    flag(2, "application : base de données injoignable")

up = lambda code: code.isdigit() and 200 <= int(code) < 400
meta = {r[0]: r for r in lines("shops.tsv")}
shops = []
for slug, origin, public in lines("checks"):
    oc, ot = origin.split(" ")
    pc, pt = public.split(" ")
    _, host, status, path = meta.get(slug, [slug, "", "active", "/"])
    s = {"slug": slug, "host": host, "status": status,
         "origin": {"code": int(oc) if oc.isdigit() else 0, "ms": round(float(ot) * 1000)},
         "public": None if pc == "-" else {"code": int(pc) if pc.isdigit() else 0, "ms": round(float(pt) * 1000)}}
    s["ok"] = up(oc) and (pc == "-" or up(pc))
    if not s["ok"]:
        where = "origine" if not up(oc) else "URL publique"
        flag(2 if status == "active" else 1, f"boutique {slug} ({host}) : {where} en échec")
    shops.append(s)
shops.sort(key=lambda s: s["slug"])
if env.get("SHOPS_ERR"): flag(1, env["SHOPS_ERR"])

age = int(rd("backup_age").strip())
if env["STACK"] == "production":
    if age < 0: flag(1, "aucune sauvegarde réussie enregistrée")
    elif age > int(env["BACKUP_MAX_AGE_H"]): flag(1, f"dernière sauvegarde il y a {age} h")

print(json.dumps({
    "version": 1,
    "stack": env["STACK"],
    "generatedAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "status": ["ok", "warn", "critical"][level],
    "host": {"memAvailableMb": avail, "memTotalMb": mem["MemTotal"] // 1024, "swapUsedPct": swap_pct,
             "load": load, "cpus": int(rd("nproc"))},
    "disks": disks,
    "containers": containers,
    "app": app,
    "shops": shops,
    "backup": {"lastSuccessAgeHours": age if age >= 0 else None},
    "alerts": alerts,
}, ensure_ascii=False, indent=2))
PY

chmod 644 "$tmp/health.json"
mv -f "$tmp/health.json" "$STATUS_FILE"
status="$(python3 -I -c 'import json,sys; print(json.load(open(sys.argv[1]))["status"])' "$STATUS_FILE")"
log "état : $status ($STATUS_FILE)"

# Alerte uniquement sur changement d'état (pas de bruit toutes les 5 minutes).
last="$(cat "$STATUS_DIR/.last-status" 2>/dev/null || echo ok)"
echo "$status" >"$STATUS_DIR/.last-status"
if [[ -n "${ALERT_WEBHOOK_URL:-}" && "$status" != "$last" ]]; then
  python3 -I -c '
import json, sys
h = json.load(open(sys.argv[1]))
msgs = "; ".join(a["message"] for a in h["alerts"]) or "tout est rétabli"
text = f"[rundinova-studio {h[\"stack\"]}] {h[\"status\"].upper()} : {msgs}"
print(json.dumps({"text": text, "content": text, "status": h["status"]}))' "$STATUS_FILE" \
  | curl -fsS -m 10 -H 'Content-Type: application/json' --data-binary @- "$ALERT_WEBHOOK_URL" >/dev/null \
  || log "envoi de l'alerte échoué"
fi

case "$status" in ok) exit 0 ;; warn) exit 1 ;; *) exit 2 ;; esac
