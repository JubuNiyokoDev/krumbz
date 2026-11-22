/**
 * TLS certificates of tenant hosts: file-based handshake with the host (no shell).
 *
 * - requestCertificate(host) writes a file named after the host into
 *   CERT_REQUESTS_DIR (default /data/cert-requests). A host-side job (nginx +
 *   certbot, see deploy/) picks it up.
 * - The job writes `<host>.json` into CERT_STATUS_DIR (default /data/cert-status):
 *   { "status": "pending" | "issued" | "error", "expiresAt": ISO string | null, "error": string | null }.
 * - getCertificateStatus(host) reads it; recordCertificateStatus() mirrors it into
 *   the tenant_certificates table for the super-admin.
 */
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Db } from "../db/client.ts";
import { tenantCertificates, type CertificateStatus } from "../db/schema.ts";

export type CertificateState = { host: string; status: CertificateStatus; expiresAt: string | null; error: string | null };

const requestsDir = () => process.env.CERT_REQUESTS_DIR ?? "/data/cert-requests";
const statusDir = () => process.env.CERT_STATUS_DIR ?? "/data/cert-status";

/** One DNS name, lower-case labels only: the value becomes a file name, so nothing else is accepted. */
const HOST_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

function safeHost(host: string): string {
  const normalized = host.trim().toLowerCase().replace(/\.$/, "");
  if (!HOST_PATTERN.test(normalized)) throw new Error(`Invalid host name: ${host}`);
  return normalized;
}

export async function requestCertificate(host: string): Promise<void> {
  const name = safeHost(host);
  const dir = requestsDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), JSON.stringify({ host: name, requestedAt: new Date().toISOString() }) + "\n", { mode: 0o644 });
}

export async function getCertificateStatus(host: string): Promise<CertificateState | null> {
  const name = safeHost(host);
  try {
    const raw = JSON.parse(await readFile(path.join(statusDir(), `${name}.json`), "utf8")) as Partial<CertificateState>;
    const status: CertificateStatus = raw.status === "issued" || raw.status === "error" ? raw.status : "pending";
    return { host: name, status, expiresAt: raw.expiresAt ?? null, error: raw.error ?? null };
  } catch {
    // No status yet: pending if a request is waiting, unknown otherwise.
    try {
      await stat(path.join(requestsDir(), name));
      return { host: name, status: "pending", expiresAt: null, error: null };
    } catch {
      return null;
    }
  }
}

/** Mirrors a status into tenant_certificates (upsert by host). */
export async function recordCertificateStatus(db: Db, tenantId: string, state: CertificateState): Promise<void> {
  const values = {
    tenantId,
    host: state.host,
    status: state.status,
    expiresAt: state.expiresAt ? new Date(state.expiresAt) : null,
    error: state.error,
  };
  await db.insert(tenantCertificates).values(values).onConflictDoUpdate({ target: tenantCertificates.host, set: values });
}
