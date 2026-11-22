/** QR code of a shop link, for print. Authenticated super-admin only. */
import { isUuid } from "@/lib/admin/validation";
import { getTenantById } from "@/lib/admin/vendors";
import { getDb } from "@/lib/db/client";
import { requireSuperadmin } from "@/lib/auth/guards";
import { qrPng, qrSvg, shopUrl } from "@/lib/admin/qr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext<"/admin/vendeurs/[id]/qr">): Promise<Response> {
  await requireSuperadmin();
  const { id } = await context.params;
  if (!isUuid(id)) return new Response("Introuvable", { status: 404 });
  const tenant = await getTenantById(getDb(), id);
  if (!tenant) return new Response("Introuvable", { status: 404 });

  const format = new URL(request.url).searchParams.get("format") === "svg" ? "svg" : "png";
  const fileName = `qr-${tenant.slug}.${format}`;
  if (format === "svg") {
    return new Response(await qrSvg(shopUrl(tenant.slug)), {
      headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Content-Disposition": `inline; filename="${fileName}"`, "Cache-Control": "private, no-store" },
    });
  }
  const png = await qrPng(shopUrl(tenant.slug));
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Content-Disposition": `inline; filename="${fileName}"`, "Cache-Control": "private, no-store" },
  });
}
