import "server-only";
import { asc, ne } from "drizzle-orm";
import { getDb, hasDatabase } from "@/lib/db/client";
import { tenants } from "@/lib/db/schema";
import { tenantOrigin } from "@/lib/tenant/hosts";
import type { Localized, PlatformLocale, TenantScene, TenantTheme } from "@/lib/tenant/types";

/**
 * Shops shown in the Rundinova Studio gallery (isoko.rundinova.com): every shop that is not paused,
 * Krumbz (first client) first, then by creation date. Card data comes from tenant.content.gallery
 * ({ imageUrl?, tagline?: Localized }), editable from the super-admin; otherwise the first scene image
 * or the logo, and the hero subtitle. Queried per request: the table is tiny and a newly created shop
 * must appear in the gallery immediately, even when the seed script writes to the database directly.
 */
export interface GalleryShop {
  name: string;
  url: string;
  imageUrl: string;
  tagline: string;
}

type Row = { slug: string; name: string; theme: TenantTheme; content: Record<string, unknown>; scenes: TenantScene[] };

async function loadRows(): Promise<Row[]> {
  if (!hasDatabase()) return [];
  return getDb()
    .select({ slug: tenants.slug, name: tenants.name, theme: tenants.theme, content: tenants.content, scenes: tenants.scenes })
    .from(tenants)
    .where(ne(tenants.status, "paused"))
    .orderBy(asc(tenants.createdAt));
}

function localized(value: unknown, locale: PlatformLocale): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const l = value as Partial<Localized>;
    return l[locale] || l.fr || "";
  }
  return "";
}

export async function listGalleryShops(locale: PlatformLocale): Promise<GalleryShop[]> {
  let rows: Row[] = [];
  try {
    rows = await loadRows();
  } catch (error) {
    console.warn("[gallery] unavailable:", (error as Error).message);
  }
  const ordered = [...rows.filter((r) => r.slug === "krumbz"), ...rows.filter((r) => r.slug !== "krumbz")];
  return ordered.map((row) => {
    const gallery = (row.content.gallery ?? {}) as { imageUrl?: unknown; tagline?: unknown };
    const hero = (row.content.hero ?? {}) as { subtitle?: unknown };
    const imageUrl = (typeof gallery.imageUrl === "string" && gallery.imageUrl) || row.scenes[0]?.imageUrl || row.theme.logoUrl || "";
    return {
      name: row.name,
      url: tenantOrigin(row.slug),
      imageUrl,
      tagline: localized(gallery.tagline, locale) || localized(hero.subtitle, locale),
    };
  });
}
