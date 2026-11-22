/**
 * Health report written every few minutes by scripts/ops/health.sh (host side) into
 * HEALTH_STATUS_FILE (default /data/status/health.json, mounted read-only in the container).
 * Parsed defensively: the page must render whatever the file contains.
 */
import { readFile, stat } from "node:fs/promises";

export type HealthLevel = "ok" | "warn" | "critical";

export interface HealthReport {
  generatedAt: string | null;
  stack: string | null;
  status: HealthLevel | "unknown";
  host: { memAvailableMb: number | null; memTotalMb: number | null; swapUsedPct: number | null; load: number[]; cpus: number | null };
  disks: { mount: string; usedPct: number; freeMb: number }[];
  containers: { name: string; state: string; health: string; memUsedMb: number | null; memLimitMb: number | null; memPct: number | null; cpuPct: number | null; restarts: number }[];
  app: { code: number; ms: number; ok: boolean; db: boolean } | null;
  shops: { slug: string; host: string; status: string; ok: boolean; originCode: number | null; publicCode: number | null }[];
  backupAgeHours: number | null;
  alerts: { level: string; message: string }[];
}

export type HealthRead = { state: "missing"; file: string } | { state: "invalid"; file: string; error: string } | { state: "ok"; file: string; report: HealthReport; fileAgeMinutes: number };

export function healthStatusFile(): string {
  return process.env.HEALTH_STATUS_FILE ?? "/data/status/health.json";
}

const obj = (v: unknown): Record<string, unknown> => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const text = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);

export function parseHealthReport(raw: unknown): HealthReport {
  const r = obj(raw);
  const host = obj(r.host);
  const app = obj(r.app);
  const status = text(r.status);
  return {
    generatedAt: text(r.generatedAt) || null,
    stack: text(r.stack) || null,
    status: status === "ok" || status === "warn" || status === "critical" ? status : "unknown",
    host: {
      memAvailableMb: num(host.memAvailableMb),
      memTotalMb: num(host.memTotalMb),
      swapUsedPct: num(host.swapUsedPct),
      load: arr(host.load).map(num).filter((n): n is number => n !== null),
      cpus: num(host.cpus),
    },
    disks: arr(r.disks).map(obj).map((d) => ({ mount: text(d.mount, "?"), usedPct: num(d.usedPct) ?? 0, freeMb: num(d.freeMb) ?? 0 })),
    containers: arr(r.containers)
      .map(obj)
      .map((c) => ({
        name: text(c.name, "?"),
        state: text(c.state, "?"),
        health: text(c.health),
        memUsedMb: num(c.memUsedMb),
        memLimitMb: num(c.memLimitMb),
        memPct: num(c.memPct),
        cpuPct: num(c.cpuPct),
        restarts: num(c.restarts) ?? 0,
      })),
    app: Object.keys(app).length ? { code: num(app.code) ?? 0, ms: num(app.ms) ?? 0, ok: app.ok === true, db: app.db === true } : null,
    shops: arr(r.shops)
      .map(obj)
      .map((s) => ({
        slug: text(s.slug, "?"),
        host: text(s.host),
        status: text(s.status),
        ok: s.ok === true,
        originCode: num(obj(s.origin).code),
        publicCode: s.public === null ? null : num(obj(s.public).code),
      })),
    backupAgeHours: num(obj(r.backup).lastSuccessAgeHours),
    alerts: arr(r.alerts)
      .map(obj)
      .map((a) => ({ level: text(a.level, "warn"), message: text(a.message) })),
  };
}

export async function readHealthStatus(file = healthStatusFile()): Promise<HealthRead> {
  let content: string;
  let mtime: Date;
  try {
    [content, { mtime }] = await Promise.all([readFile(/*turbopackIgnore: true*/ file, "utf8"), stat(/*turbopackIgnore: true*/ file)]);
  } catch {
    return { state: "missing", file };
  }
  try {
    return { state: "ok", file, report: parseHealthReport(JSON.parse(content)), fileAgeMinutes: Math.round((Date.now() - mtime.getTime()) / 60_000) };
  } catch (error) {
    return { state: "invalid", file, error: (error as Error).message };
  }
}
