import { DEV_TENANT_COOKIE, normalizeHost, resolveHost } from "@/lib/tenant/hosts";
import { requestHostHeader } from "@/lib/tenant/request-host";
import { lookupTenantRoute } from "@/lib/tenant/route-cache";
import { forTenant } from "@/lib/tenant/scoped";

/**
 * Anonymous storefront counters (docs/plan.md §2, exigence 6): POST { kind, product? } from
 * src/components/stats/StatsBeacon.tsx. The shop is resolved from the Host (never from the body);
 * nothing about the visitor is read or stored: no IP, no cookie, no identifier. Counted only when
 * the shop has the "stats" feature. Always answers 204 so that the beacon never reveals anything.
 */
const KINDS = new Set(["visit", "product_view", "whatsapp_click"] as const);
type Kind = "visit" | "product_view" | "whatsapp_click";
const PRODUCT = /^[a-z0-9][a-z0-9-]{0,80}$/;
const done = () => new Response(null, { status: 204, headers: { "cache-control": "no-store" } });

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { kind?: unknown; product?: unknown } | null;
    const kind = body?.kind as Kind;
    if (!KINDS.has(kind)) return done();
    const host = normalizeHost(requestHostHeader(request.headers));
    const isBareLocal = host === "localhost" || host === "127.0.0.1";
    const devTenant = isBareLocal ? (request.headers.get("cookie")?.match(new RegExp(`${DEV_TENANT_COOKIE}=([a-z0-9-]+)`))?.[1] ?? null) : null;
    const target = resolveHost(host, { devTenant });
    if (target.kind !== "tenant" || target.staging) return done();
    const route = await lookupTenantRoute(target.slug);
    if (!route || route.status === "paused") return done();
    const scope = forTenant(route.id);
    if (!(await scope.features.get()).stats) return done();
    let productId: string | null = null;
    if (kind === "product_view") {
      const slug = typeof body?.product === "string" ? body.product : "";
      if (!PRODUCT.test(slug)) return done();
      productId = (await scope.products.getBySlug(slug))?.id ?? null;
      if (!productId) return done();
    }
    await scope.stats.increment(kind, { productId });
  } catch (error) {
    console.warn("[stats] not counted:", (error as Error).message);
  }
  return done();
}
