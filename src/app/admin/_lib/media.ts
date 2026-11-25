import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { media } from "@/lib/db/schema";
import { storeImage, UploadError, type StoredImage } from "@/lib/uploads/images";
import { readBrandSource, readStoredBrandFile, removeBrandSet, writeBrandSet, type BrandSource } from "@/lib/uploads/brand";
import type { TenantTheme } from "@/lib/tenant/types";

export const UPLOAD_ERRORS: Record<UploadError["code"], string> = {
  too_large: "Image trop lourde (8 Mo maximum).",
  not_image: "Ce fichier n'est pas une image lisible (PNG, SVG, JPEG, WebP, AVIF).",
  empty: "Fichier vide.",
};

/** Stores an image of a vendor (WebP/AVIF variants) and records it in `media`. */
export async function storeTenantImage(tenantId: string, file: File, actorUserId: string, maxWidth?: number): Promise<StoredImage> {
  const stored = await storeImage(tenantId, file, { maxWidth });
  await getDb().insert(media).values({
    tenantId,
    kind: "image",
    path: stored.key,
    mime: stored.mime,
    bytes: stored.bytes,
    width: stored.width,
    height: stored.height,
    variants: stored.variants,
    createdBy: actorUserId,
  });
  return stored;
}

export function uploadErrorMessage(error: unknown): string | null {
  return error instanceof UploadError ? UPLOAD_ERRORS[error.code] : null;
}

/** A logo stored before the brand sets existed (/uploads/… or a public /images/… path). */
async function legacyFile(tenantId: string, url: string | null | undefined): Promise<Buffer | null> {
  if (!url) return null;
  const stored = await readStoredBrandFile(tenantId, url);
  if (stored) return stored;
  const clean = url.split(/[?#]/)[0];
  if (!clean.startsWith("/images/") || clean.includes("..")) return null;
  return readFile(path.join(process.cwd(), "public", clean)).catch(() => null);
}

/**
 * Logo / icon of a shop → its brand set (src/lib/uploads/brand.ts), regenerated on every theme save so that
 * the share card and the opaque icons follow the colours. Returns the theme fields to store.
 */
export async function buildBrandTheme(
  tenantId: string,
  previous: Pick<TenantTheme, "logoUrl" | "iconUrl" | "brand">,
  input: { logo: File | null; icon: File | null; removeLogo: boolean; removeIcon: boolean; colors: { background: string; primary: string; accent: string } },
  actorUserId: string,
): Promise<Pick<TenantTheme, "logoUrl" | "iconUrl" | "brand">> {
  let logo: BrandSource | null = null;
  if (input.logo) logo = await readBrandSource(input.logo);
  else if (!input.removeLogo) {
    const png = await legacyFile(tenantId, previous.brand?.logoPng ?? previous.logoUrl);
    const svg = previous.brand?.logoSvg ? await legacyFile(tenantId, previous.brand.logoSvg) : null;
    logo = png ? (previous.brand?.logoPng ? { png, svg: svg?.toString("utf8") ?? null } : await readBrandSource(png)) : null;
  }
  let icon: Buffer | null = null;
  if (input.icon) icon = (await readBrandSource(input.icon)).png;
  else if (!input.removeIcon && previous.iconUrl) {
    const stored = await legacyFile(tenantId, previous.iconUrl);
    icon = stored ? (previous.brand ? stored : (await readBrandSource(stored)).png) : null;
  }

  const brand = await writeBrandSet(tenantId, { logo, icon, colors: input.colors });
  if (brand) {
    const id = /\/uploads\/[^/]+\/([^/]+)\//.exec(brand.icon32)?.[1];
    if (id) await getDb().insert(media).values({ tenantId, kind: "image", path: id, mime: "image/png", bytes: 0, width: 512, height: 512, variants: Object.fromEntries(Object.entries(brand).filter((e): e is [string, string] => !!e[1])), createdBy: actorUserId });
  }
  if (previous.brand) {
    const oldId = /\/uploads\/[^/]+\/([^/]+)\//.exec(previous.brand.icon32)?.[1];
    await removeBrandSet(tenantId, previous.brand);
    if (oldId) await getDb().delete(media).where(and(eq(media.tenantId, tenantId), eq(media.path, oldId)));
  }
  return {
    logoUrl: brand?.logo ?? null,
    iconUrl: brand && icon ? brand.icon512.replace(/icon-512\.png$/, "source.png") : null,
    brand: brand ?? null,
  };
}
