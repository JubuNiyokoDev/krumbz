/**
 * Audit trail (table audit_log): who changed what. Vendor-side code passes the
 * tenant id of the session, never one taken from the request.
 */
import { getDb, type Db } from "../db/client.ts";
import { auditLog } from "../db/schema.ts";

export interface AuditEntry {
  /** NULL = platform-level action. */
  tenantId: string | null;
  actorUserId: string | null;
  /** e.g. "product.update", "contact.update", "auth.password_change". */
  action: string;
  entity?: string | null;
  entityId?: string | null;
  data?: Record<string, unknown> | null;
}

export async function recordAudit(entry: AuditEntry, db: Db = getDb()): Promise<void> {
  await db.insert(auditLog).values({
    tenantId: entry.tenantId,
    actorUserId: entry.actorUserId,
    action: entry.action,
    entity: entry.entity ?? null,
    entityId: entry.entityId ?? null,
    data: entry.data ?? null,
  });
}
