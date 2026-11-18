import "server-only";
import fs from "node:fs";
import path from "node:path";

/** Share image provided by the brand (see public/images/README.md). */
export const OG_IMAGE_PATH = "/images/og/og-image.jpg";
/** Generated branded card (src/app/og-fallback.png/route.tsx), used until the real file exists. */
export const OG_FALLBACK_PATH = "/og-fallback.png";
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

function realOgStat(): fs.Stats | null {
  try {
    const stat = fs.statSync(path.join(process.cwd(), "public", OG_IMAGE_PATH));
    return stat.isFile() && stat.size > 0 ? stat : null;
  } catch {
    return null;
  }
}

/**
 * URL (site-relative, resolved against metadataBase) of the Open Graph / Twitter image:
 * - public/images/og/og-image.jpg when the file exists, versioned by its
 *   modification time so social networks and CDNs refetch a replaced file;
 * - otherwise the generated fallback card /og-fallback.png.
 * Pages are statically generated: the check runs on every request in
 * `next dev` and at build time in production (picked up at the next deploy).
 */
export function ogImageUrl(): string {
  const stat = realOgStat();
  if (!stat) return OG_FALLBACK_PATH;
  return `${OG_IMAGE_PATH}?v=${Math.round(stat.mtimeMs).toString(36)}`;
}

/** Same as ogImageUrl() with the metadata fields Next.js expects (openGraph.images item). */
export function ogImage(alt: string) {
  const url = ogImageUrl();
  return { url, ...OG_IMAGE_SIZE, alt, type: url === OG_FALLBACK_PATH ? "image/png" : "image/jpeg" };
}
