import "server-only";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { TEXTURE_KEYS, type TextureKey, type TextureMap } from "./registry";

export interface ResolvedImage {
  /** Public path, e.g. /images/story/champignons.jpg */
  file: string;
  exists: boolean;
  src: string | null;
  width: number;
  height: number;
  blurDataURL?: string;
}

const PUBLIC_DIR = path.join(process.cwd(), "public");
const cache = new Map<string, { mtime: number; value: ResolvedImage }>();

function fileStat(publicPath: string) {
  try {
    const stat = fs.statSync(path.join(PUBLIC_DIR, publicPath));
    return stat.isFile() && stat.size > 0 ? stat : null;
  } catch {
    return null;
  }
}

/**
 * Looks for an image in /public. Missing files resolve to a placeholder
 * description so the UI can show a clearly-labelled stand-in.
 * Results are memoized by modification time: replacing a file is detected.
 */
export async function resolveImage(publicPath: string, fallback = { width: 1600, height: 900 }): Promise<ResolvedImage> {
  const stat = fileStat(publicPath);
  if (!stat) return { file: publicPath, exists: false, src: null, ...fallback };

  const hit = cache.get(publicPath);
  if (hit && hit.mtime === stat.mtimeMs) return hit.value;

  const abs = path.join(PUBLIC_DIR, publicPath);
  let value: ResolvedImage;
  try {
    const image = sharp(abs);
    const meta = await image.metadata();
    const blur = await sharp(abs).resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
    value = {
      file: publicPath,
      exists: true,
      src: publicPath,
      width: meta.width ?? fallback.width,
      height: meta.height ?? fallback.height,
      blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
    };
  } catch {
    value = { file: publicPath, exists: false, src: null, ...fallback };
  }
  cache.set(publicPath, { mtime: stat.mtimeMs, value });
  return value;
}

export async function resolveImages<K extends string>(paths: Record<K, string>) {
  const entries = await Promise.all(
    Object.entries<string>(paths).map(async ([key, p]) => [key, await resolveImage(p)] as const),
  );
  return Object.fromEntries(entries) as Record<K, ResolvedImage>;
}

/**
 * URLs of the 3D textures that exist. Prefers an optimized KTX2 or WebP
 * sibling produced by `npm run optimize:3d` when it is newer than the source.
 */
export function resolveTextures(): TextureMap {
  const result = {} as TextureMap;
  for (const [key, p] of Object.entries(TEXTURE_KEYS) as [TextureKey, string][]) {
    const stat = fileStat(p);
    if (!stat) {
      result[key] = null;
      continue;
    }
    const version = Math.round(stat.mtimeMs).toString(36);
    const base = p.replace(/\.png$/, "");
    const ktx2 = fileStat(`${base}.ktx2`);
    const webp = fileStat(`${base}.webp`);
    if (ktx2 && ktx2.mtimeMs >= stat.mtimeMs) result[key] = `${base}.ktx2?v=${version}`;
    else if (webp && webp.mtimeMs >= stat.mtimeMs) result[key] = `${base}.webp?v=${version}`;
    else result[key] = `${p}?v=${version}`;
  }
  return result;
}
