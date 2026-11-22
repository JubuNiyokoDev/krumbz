/**
 * Automatic pause at expiry (docs/plan.md §2: daily job « expiration → Boutique en pause »).
 *
 * Every trial / active subscription whose end date has passed becomes "expired" and its
 * shop is paused (tenants.status = "paused"): the proxy then serves the « boutique en pause »
 * page. Idempotent: a second run finds nothing to do. Open-ended subscriptions (ends_at NULL)
 * never expire. A tenant that still has another running subscription is not paused.
 *
 * Callers:
 *   POST /api/cron/expire  (Authorization: Bearer $CRON_SECRET), passes revalidateTenant
 *   npm run billing:expire (scripts/billing-expire.mts): the proxy route cache picks the pause up within 30 s
 */
import { and, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { getDb, type Db } from "../db/client.ts";
import { subscriptions, tenants } from "../db/schema.ts";
import { invalidateTenantRoute } from "../tenant/route-cache.ts";
import { audit } from "../admin/audit.ts";

export interface ExpireResult {
  /** Subscriptions marked "expired". */
  expired: number;
  /** Slugs of the shops paused by this run. */
  paused: string[];
}

export async function expireSubscriptions(
  db: Db = getDb(),
  options: { now?: Date; onPaused?: (slug: string) => void | Promise<void> } = {},
): Promise<ExpireResult> {
  const now = options.now ?? new Date();
  const due = await db
    .select({ id: subscriptions.id, tenantId: subscriptions.tenantId, status: subscriptions.status, endsAt: subscriptions.endsAt })
    .from(subscriptions)
    .where(and(inArray(subscriptions.status, ["trial", "active"]), lte(subscriptions.endsAt, now)));
  if (!due.length) return { expired: 0, paused: [] };

  const paused: string[] = [];
  let expired = 0;
  for (const tenantId of Array.from(new Set(due.map((d) => d.tenantId)))) {
    const ids = due.filter((d) => d.tenantId === tenantId).map((d) => d.id);
    const slug = await db.transaction(async (tx) => {
      const marked = await tx
        .update(subscriptions)
        .set({ status: "expired" })
        .where(and(inArray(subscriptions.id, ids), inArray(subscriptions.status, ["trial", "active"]), lte(subscriptions.endsAt, now)))
        .returning({ id: subscriptions.id, endsAt: subscriptions.endsAt });
      expired += marked.length;
      if (!marked.length) return null;
      const [stillRunning] = await tx
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, tenantId),
            inArray(subscriptions.status, ["trial", "active"]),
            or(isNull(subscriptions.endsAt), gt(subscriptions.endsAt, now)),
          ),
        )
        .limit(1);
      if (stillRunning) return null;
      const [tenant] = await tx
        .update(tenants)
        .set({ status: "paused" })
        .where(and(eq(tenants.id, tenantId), inArray(tenants.status, ["active", "trial"])))
        .returning({ slug: tenants.slug });
      if (!tenant) return null;
      await audit(tx, {
        actorUserId: null,
        tenantId,
        action: "billing.expire",
        entity: "tenant",
        entityId: tenantId,
        data: { subscriptions: marked.map((m) => m.id), endedAt: marked[0].endsAt?.toISOString() ?? null },
      });
      return tenant.slug;
    });
    if (slug) {
      paused.push(slug);
      invalidateTenantRoute(slug);
      await options.onPaused?.(slug);
    }
  }
  return { expired, paused };
}
