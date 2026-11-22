import { asc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { tenants } from "@/lib/db/schema";
import { rootDomain } from "@/lib/tenant/hosts";

/**
 * Shops to probe by scripts/ops/health.sh: { shops: [{ slug, host, status }] }.
 * Public information only (every shop is reachable on its sub-domain anyway).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await getDb().select({ slug: tenants.slug, status: tenants.status }).from(tenants).orderBy(asc(tenants.slug));
    const root = rootDomain();
    return Response.json(
      { shops: rows.map((row) => ({ slug: row.slug, host: `${row.slug}.${root}`, status: row.status })) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json({ shops: [], error: "database" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
