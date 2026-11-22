/**
 * Daily expiry job (self-hosted cron, see docs/deploiement.md).
 *
 *   curl -X POST https://isoko.rundinova.com/api/cron/expire \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * Fails closed when CRON_SECRET is not configured. Idempotent: a second run does nothing.
 */
import { getDb } from "@/lib/db/client";
import { expireSubscriptions } from "@/lib/billing/expire";
import { revalidateTenant } from "@/lib/tenant/storefront";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Non autorisé." }, { status: 401 });
  }
  try {
    const result = await expireSubscriptions(getDb(), { onPaused: (slug) => revalidateTenant(slug) });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/expire]", (error as Error).message);
    return Response.json({ ok: false, error: "Échec du traitement." }, { status: 500 });
  }
}
