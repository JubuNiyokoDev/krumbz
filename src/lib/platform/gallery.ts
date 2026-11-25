import "server-only";
import { and, asc, eq, inArray, notExists, sql } from "drizzle-orm";
import { getDb, hasDatabase } from "@/lib/db/client";
import { subscriptions, tenants } from "@/lib/db/schema";
import { publicOrigin } from "@/lib/tenant/hosts";
import { KRUMBZ_PALETTE, resolvePalette } from "@/lib/storefront/theme";
import { mediaExists } from "@/templates/boutique/content";
import { loadContent } from "@/lib/content";
import type { Localized, PlatformLocale, TenantScene, TenantTheme } from "@/lib/tenant/types";

/**
 * Shops shown in « Nos boutiques partenaires » on isoko.rundinova.com: every ACTIVE or TRIAL shop,
 * Krumbz (first client) first, then by creation date. HIDE_DEMO_TENANTS=1 leaves out the demonstration
 * shops (subscription plan "demo", e.g. Ikirenge). Card data: name, logo, palette, a preview image
 * (content.gallery.imageUrl, else the share image, else the first scene photo, else the generated share
 * card) and a tagline (content.gallery.tagline, else the hero subtitle). Queried per request: the table is
 * tiny and a newly created shop must appear immediately.
 */
export interface GalleryShop {
  slug: string;
  name: string;
  url: string;
  imageUrl: string;
  logoUrl: string | null;
  /** Page colour, dark brand colour, accent (the shop's palette). */
  colors: { background: string; primary: string; accent: string };
  tagline: string;
}

type Row = { slug: string; name: string; template: string; theme: TenantTheme; content: Record<string, unknown>; scenes: TenantScene[] };

const DEMO_PLAN = "demo";

async function loadRows(): Promise<Row[]> {
  if (!hasDatabase()) return [];
  const db = getDb();
  const hideDemo = process.env.HIDE_DEMO_TENANTS === "1";
  const demo = db
    .select({ one: sql`1` })
    .from(subscriptions)
    .where(and(eq(subscriptions.tenantId, tenants.id), eq(subscriptions.plan, DEMO_PLAN)));
  return db
    .select({ slug: tenants.slug, name: tenants.name, template: tenants.template, theme: tenants.theme, content: tenants.content, scenes: tenants.scenes })
    .from(tenants)
    .where(hideDemo ? and(inArray(tenants.status, ["active", "trial"]), notExists(demo)) : inArray(tenants.status, ["active", "trial"]))
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

const first = (...candidates: (string | null | undefined)[]) => candidates.find((c) => mediaExists(c)) ?? null;

export async function listGalleryShops(locale: PlatformLocale): Promise<GalleryShop[]> {
  let rows: Row[] = [];
  try {
    rows = await loadRows();
  } catch (error) {
    console.warn("[gallery] unavailable:", (error as Error).message);
  }
  const ordered = [...rows.filter((r) => r.slug === "krumbz"), ...rows.filter((r) => r.slug !== "krumbz")];
  return ordered.map((row) => {
    const bespoke = row.template === "krumbz";
    const gallery = (row.content.gallery ?? {}) as { imageUrl?: unknown; tagline?: unknown };
    const media = (row.content.media ?? {}) as { og?: string | null };
    // Shop texts follow the Krumbz schema per locale: <locale>.home.intro.subtitle as a tagline fallback.
    const texts = (l: string) => (row.content[l] ?? {}) as { home?: { intro?: { subtitle?: unknown } } };
    const scene = row.scenes[0] as { image?: { landscape?: string; fallback?: string | null } } | undefined;
    const palette = bespoke ? KRUMBZ_PALETTE : resolvePalette(row.theme);
    const imageUrl =
      first(
        typeof gallery.imageUrl === "string" ? gallery.imageUrl : null,
        bespoke ? "/images/og/og-image.jpg" : media.og,
        scene?.image?.landscape,
        scene?.image?.fallback,
        row.theme.brand?.og,
      ) ?? "";
    return {
      slug: row.slug,
      name: row.name,
      url: publicOrigin(row.slug),
      imageUrl,
      logoUrl: bespoke ? "/icon.png" : first(row.theme.brand?.logo, row.theme.logoUrl),
      colors: { background: palette.cream, primary: palette.navy, accent: palette.gold },
      tagline:
        localized(gallery.tagline, locale) ||
        localized(texts(locale).home?.intro?.subtitle, locale) ||
        localized(texts("fr").home?.intro?.subtitle, locale) ||
        (bespoke ? loadContent(locale).home.intro.subtitle : ""),
    };
  });
}
