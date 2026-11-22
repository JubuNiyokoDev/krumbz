import { sql } from "drizzle-orm";
import { getDb, hasDatabase } from "@/lib/db/client";

/** Liveness + database check for the Docker HEALTHCHECK and scripts/ops/health.sh. Not cached. */
export const dynamic = "force-dynamic";

export async function GET() {
  let db = false;
  if (hasDatabase()) {
    try {
      await getDb().execute(sql`select 1`);
      db = true;
    } catch {
      db = false;
    }
  }
  return Response.json({ ok: db, db }, { status: db ? 200 : 503, headers: { "cache-control": "no-store" } });
}
