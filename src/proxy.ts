import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { espaceRouting, marketingRouting } from "./i18n/platform";
import { DEV_TENANT_COOKIE, DEV_TENANT_PARAM, isValidTenantSlug, normalizeHost, resolveHost } from "./lib/tenant/hosts";
import { requestHostHeader } from "./lib/tenant/request-host";
import { lookupTenantRoute } from "./lib/tenant/route-cache";

/**
 * Multi-tenant routing (docs/plan.md §2–3). Public URLs never change; the host
 * selects an internal route tree:
 *
 *   <slug>.rundinova.com/<path>  → /tpl/boutique/<slug>/<locale>/<path>     (next-intl pathnames: /en/products …)
 *                                → /paused/<slug>/<locale>                   (status "paused")
 *   isoko.rundinova.com/<path>   → /marketing/<locale>/<path>
 *   espace.rundinova.com/<path>  → /espace/<locale>/<path>
 *   admin.rundinova.com/<path>   → /admin/<path>
 *   staging-<x>.rundinova.com    → same as <x>
 *   rundinova.com, www, reserved or unknown sub-domain, unknown shop → 404 (global-not-found)
 *
 * Dev: <slug>.localhost:3000, or localhost:3000/?tenant=<slug> (remembered in a
 * cookie; ?tenant= with no value forgets it). Bare localhost = marketing.
 * The slug → template/status lookup is cached in memory (src/lib/tenant/route-cache.ts).
 */
const storefrontI18n = createMiddleware(routing);
const marketingI18n = createMiddleware(marketingRouting);
const espaceI18n = createMiddleware(espaceRouting);

/** Internal path that matches no route: renders src/app/global-not-found.tsx with a 404. */
const NOT_FOUND_PATH = "/_rs/not-found";

function rewrite(request: NextRequest, pathname: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.rewrite(url);
}

/** Runs next-intl (redirects, localized pathnames), then prefixes its internal path with the route tree. */
function withPrefix(response: NextResponse, request: NextRequest, prefix: string): NextResponse {
  if (response.headers.has("location")) return response;
  const target = new URL(response.headers.get("x-middleware-rewrite") ?? request.url);
  target.pathname = `${prefix}${target.pathname === "/" ? "" : target.pathname}`;
  response.headers.set("x-middleware-rewrite", target.toString());
  response.headers.delete("x-middleware-next");
  return response;
}

function devTenantOf(request: NextRequest): string | null {
  const param = request.nextUrl.searchParams.get(DEV_TENANT_PARAM);
  if (param !== null) return param || null;
  return request.cookies.get(DEV_TENANT_COOKIE)?.value ?? null;
}

/** Remembers / forgets ?tenant=<slug> on bare localhost so that internal links keep the tenant. */
function syncDevTenantCookie(request: NextRequest, response: NextResponse): NextResponse {
  const param = request.nextUrl.searchParams.get(DEV_TENANT_PARAM);
  if (param === null) return response;
  if (param && isValidTenantSlug(param)) response.cookies.set(DEV_TENANT_COOKIE, param, { path: "/", sameSite: "lax", httpOnly: true });
  else response.cookies.delete(DEV_TENANT_COOKIE);
  return response;
}

export default async function proxy(request: NextRequest): Promise<NextResponse> {
  const host = normalizeHost(requestHostHeader(request.headers));
  const isBareLocal = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  const target = resolveHost(host, { devTenant: isBareLocal ? devTenantOf(request) : null });
  const { pathname } = request.nextUrl;

  let response: NextResponse;
  switch (target.kind) {
    case "none":
      return rewrite(request, NOT_FOUND_PATH);
    case "admin":
      response = rewrite(request, `/admin${pathname === "/" ? "" : pathname}`);
      break;
    case "marketing":
      response = pathname === "/sitemap.xml" ? rewrite(request, "/marketing/sitemap.xml") : withPrefix(marketingI18n(request), request, "/marketing");
      break;
    case "espace":
      if (pathname === "/sitemap.xml") return rewrite(request, NOT_FOUND_PATH);
      response = withPrefix(espaceI18n(request), request, "/espace");
      break;
    case "tenant": {
      let route;
      try {
        route = await lookupTenantRoute(target.slug);
      } catch (error) {
        console.error("[proxy] tenant lookup failed", (error as Error).message);
        return new NextResponse("Service momentanément indisponible.", { status: 503, headers: { "retry-after": "30" } });
      }
      if (!route) return rewrite(request, NOT_FOUND_PATH);
      if (route.status === "paused") {
        const first = pathname.split("/")[1];
        const locale = (route.locales as string[]).includes(first) ? first : route.locales[0];
        response = rewrite(request, `/paused/${route.slug}/${locale}`);
      } else if (pathname === "/sitemap.xml") {
        response = rewrite(request, `/tpl/boutique/${route.slug}/sitemap.xml`);
      } else {
        // One template for every shop (Krumbz included): only the data changes.
        response = withPrefix(storefrontI18n(request), request, `/tpl/boutique/${route.slug}`);
      }
      break;
    }
  }
  return isBareLocal ? syncDevTenantCookie(request, response) : response;
}

export const config = {
  // Everything except API, Next internals, Vercel internals and files with an extension (+ the per-host sitemap).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/sitemap.xml"],
};
