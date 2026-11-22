/**
 * Statistics overview of the super-admin: aggregated daily counters (stats_daily) only —
 * no IP, no cookie, no visitor id exists in the database. Shops without the "stats" feature are listed as disabled.
 */
import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { products, statsDaily, tenantFeatures, tenants } from "../db/schema.ts";
import type { Localized } from "../tenant/types.ts";

export interface VendorStats {
  tenantId: string;
  slug: string;
  name: string;
  enabled: boolean;
  visits: number;
  productViews: number;
  whatsappClicks: number;
  topProducts: { name: string; views: number }[];
}

/** First day (YYYY-MM-DD, UTC) of a window of `days` days ending today. */
export function windowStart(days: number, now = new Date()): string {
  return new Date(now.getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
}

export async function statsOverview(db: Db, days: number, now = new Date()): Promise<VendorStats[]> {
  const since = windowStart(days, now);
  const shops = await db.select({ id: tenants.id, slug: tenants.slug, name: tenants.name }).from(tenants).orderBy(asc(tenants.name));
  const enabledRows = await db
    .select({ tenantId: tenantFeatures.tenantId })
    .from(tenantFeatures)
    .where(and(eq(tenantFeatures.key, "stats"), eq(tenantFeatures.enabled, true)));
  const enabled = new Set(enabledRows.map((r) => r.tenantId));
  const ids = shops.filter((s) => enabled.has(s.id)).map((s) => s.id);

  const totals = ids.length
    ? await db
        .select({ tenantId: statsDaily.tenantId, kind: statsDaily.kind, total: sql<number>`sum(${statsDaily.count})::int` })
        .from(statsDaily)
        .where(and(inArray(statsDaily.tenantId, ids), gte(statsDaily.day, since)))
        .groupBy(statsDaily.tenantId, statsDaily.kind)
    : [];
  const top = ids.length
    ? await db
        .select({ tenantId: statsDaily.tenantId, name: products.name, views: sql<number>`sum(${statsDaily.count})::int` })
        .from(statsDaily)
        .innerJoin(products, and(eq(products.id, statsDaily.productId), eq(products.tenantId, statsDaily.tenantId)))
        .where(and(inArray(statsDaily.tenantId, ids), gte(statsDaily.day, since), eq(statsDaily.kind, "product_view")))
        .groupBy(statsDaily.tenantId, products.id, products.name)
        .orderBy(sql`sum(${statsDaily.count}) desc`)
    : [];

  return shops.map((shop) => {
    const sum = (kind: string) => totals.find((t) => t.tenantId === shop.id && t.kind === kind)?.total ?? 0;
    return {
      tenantId: shop.id,
      slug: shop.slug,
      name: shop.name,
      enabled: enabled.has(shop.id),
      visits: sum("visit"),
      productViews: sum("product_view"),
      whatsappClicks: sum("whatsapp_click"),
      topProducts: top
        .filter((t) => t.tenantId === shop.id)
        .slice(0, 5)
        .map((t) => ({ name: (t.name as Localized).fr, views: t.views })),
    };
  });
}
