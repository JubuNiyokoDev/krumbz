import { getTenantBySlug } from "@/lib/tenant/storefront";
import { isValidTenantSlug } from "@/lib/tenant/hosts";
import { resolvePalette } from "@/lib/storefront/theme";

/**
 * Web app manifest of a shop (linked from its storefront layout). Icons are the brand set generated
 * from its favicon / logo (src/lib/uploads/brand.ts). Data cached per tenant (tag tenant:<slug>).
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/manifest/[slug]">) {
  const { slug } = await params;
  const tenant = isValidTenantSlug(slug) ? await getTenantBySlug(slug) : null;
  if (!tenant || tenant.status === "paused") return new Response("Not found", { status: 404 });
  const palette = resolvePalette(tenant.theme);
  const brand = tenant.theme.brand;
  const manifest = {
    name: tenant.name,
    short_name: tenant.name.slice(0, 12),
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: palette.cream,
    theme_color: palette.cream,
    icons: brand
      ? [
          { src: brand.icon192, sizes: "192x192", type: "image/png", purpose: "any" },
          { src: brand.icon512, sizes: "512x512", type: "image/png", purpose: "any" },
          { src: brand.icon512, sizes: "512x512", type: "image/png", purpose: "maskable" },
        ]
      : [],
  };
  return Response.json(manifest, {
    headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=300, stale-while-revalidate=86400" },
  });
}
