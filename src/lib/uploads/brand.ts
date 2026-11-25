import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type Metadata, type Sharp } from "sharp";
import { MAX_UPLOAD_BYTES, UploadError, uploadsDir } from "./images.ts";
import type { TenantBrandAssets } from "../tenant/types.ts";

/**
 * Brand set of a shop (logo + icons + share card), generated with sharp from the uploaded logo
 * (PNG / JPEG / WebP / AVIF / SVG) and the optional square icon:
 *
 *   UPLOADS_DIR/<tenant>/<id>/logo.png      master, transparency kept (≤ 1024 px)
 *                             logo.webp     displayed logo (alpha kept, ≤ 640 px wide)
 *                             logo.svg      original SVG, sanitised (only when an SVG was uploaded)
 *                             source.png    square icon source (uploaded icon, else the logo)
 *                             icon-32.png   favicon (transparent)
 *                             icon-180.png  apple-touch-icon (opaque, shop background)
 *                             icon-192.png / icon-512.png  web app manifest (opaque, padded)
 *                             og.png        1200 × 630 share card: logo on the shop colours
 *
 * Every save writes a new <id> (files are served immutable by src/app/uploads/[...path]/route.ts).
 */

const RASTER = new Set(["jpeg", "png", "webp", "avif", "gif", "tiff", "heif"]);
const PIXELS = 50_000_000;

export interface BrandSource {
  png: Buffer;
  svg: string | null;
}

/** Removes everything that could run or load something from an SVG (it is also served with a strict CSP). */
export function sanitizeSvg(input: string): string | null {
  let svg = input.replace(/^﻿/, "");
  if (/<!DOCTYPE|<!ENTITY/i.test(svg)) return null;
  const start = svg.search(/<svg[\s>]/i);
  const end = svg.toLowerCase().lastIndexOf("</svg>");
  if (start < 0 || end < start) return null;
  svg = svg.slice(start, end + "</svg>".length);
  svg = svg
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|foreignObject|iframe|embed|object|audio|video|canvas|handler|listener)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|foreignObject|iframe|embed|object|audio|video|canvas|handler|listener)\b[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // Links: internal references and embedded raster images only.
    .replace(/\s(?:xlink:)?href\s*=\s*("([^"]*)"|'([^']*)')/gi, (match, _q, d, s) => {
      const value = String(d ?? s ?? "").trim();
      return value.startsWith("#") || /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(value) ? match : "";
    })
    .replace(/@import[^;]*;?/gi, "")
    .replace(/url\(\s*(['"]?)(?!#)[^)]*\1\s*\)/gi, "none")
    .replace(/javascript:/gi, "");
  return svg;
}

function looksLikeSvg(buffer: Buffer, file?: File): boolean {
  if (file?.type === "image/svg+xml" || /\.svg$/i.test(file?.name ?? "")) return true;
  const head = buffer.subarray(0, 1024).toString("utf8").trimStart();
  return head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"));
}

/** Uploaded logo/icon → lossless PNG (alpha kept, transparent margins trimmed) + the sanitised SVG if any. */
export async function readBrandSource(file: File | Buffer): Promise<BrandSource> {
  const input = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer());
  if (!input.length) throw new UploadError("empty");
  if (input.length > MAX_UPLOAD_BYTES) throw new UploadError("too_large");
  let svg: string | null = null;
  let pipeline: Sharp;
  if (looksLikeSvg(input, Buffer.isBuffer(file) ? undefined : file)) {
    svg = sanitizeSvg(input.toString("utf8"));
    if (!svg) throw new UploadError("not_image");
    pipeline = sharp(Buffer.from(svg), { density: 288, limitInputPixels: PIXELS });
  } else {
    pipeline = sharp(input, { limitInputPixels: PIXELS, animated: false });
  }
  let meta: Metadata;
  try {
    meta = await pipeline.clone().metadata();
  } catch {
    throw new UploadError("not_image");
  }
  if (!meta.format || !(RASTER.has(meta.format) || meta.format === "svg")) throw new UploadError("not_image");
  let png: Buffer;
  try {
    png = await pipeline.rotate().resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: !svg }).ensureAlpha().png().toBuffer();
  } catch {
    throw new UploadError("not_image");
  }
  // Transparent margins only (a white JPEG background is kept as is).
  if (meta.hasAlpha || svg) {
    try {
      const trimmed = await sharp(png).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 }).png().toBuffer();
      if ((await sharp(trimmed).metadata()).width) png = trimmed;
    } catch {
      // Fully transparent or uniform image: keep it as is.
    }
  }
  return { png, svg };
}

/** Reads back a PNG of this tenant's previous brand set (/uploads/<tenant>/<id>/<file>), or null. */
export async function readStoredBrandFile(owner: string, url: string | null | undefined): Promise<Buffer | null> {
  if (!url) return null;
  const match = /^\/uploads\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/([a-z0-9._-]+)$/i.exec(url.split(/[?#]/)[0]);
  if (!match || match[1] !== owner) return null;
  try {
    return await readFile(path.join(uploadsDir(), match[1], match[2], match[3]));
  } catch {
    return null;
  }
}

function rgb(hex: string) {
  const v = /^#?([0-9a-f]{6})$/i.exec(hex)?.[1] ?? "ffffff";
  return { r: parseInt(v.slice(0, 2), 16), g: parseInt(v.slice(2, 4), 16), b: parseInt(v.slice(4, 6), 16) };
}

/** Square icon: the source centred with a margin, on a transparent or opaque background. */
async function squareIcon(source: Buffer, size: number, pad: number, background: string | null): Promise<Buffer> {
  const inner = Math.max(1, Math.round(size * (1 - 2 * pad)));
  const art = await sharp(source).resize({ width: inner, height: inner, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const bg = background ? { ...rgb(background), alpha: 1 } : { r: 0, g: 0, b: 0, alpha: 0 };
  return sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: art, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** 1200 × 630 share card: logo on the page colour, a band of the brand colour and an accent rule. */
async function ogCard(logo: Buffer, colors: { background: string; primary: string; accent: string }): Promise<Buffer> {
  const { data: art, info } = await sharp(logo).resize({ width: 720, height: 300, fit: "inside" }).png().toBuffer({ resolveWithObject: true });
  const overlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">` +
      `<circle cx="1110" cy="-40" r="260" fill="${colors.accent}" opacity="0.18"/>` +
      `<circle cx="70" cy="640" r="200" fill="${colors.primary}" opacity="0.10"/>` +
      `<rect x="0" y="582" width="1200" height="48" fill="${colors.primary}"/>` +
      `<rect x="0" y="574" width="1200" height="8" fill="${colors.accent}"/>` +
      `</svg>`,
  );
  return sharp({ create: { width: 1200, height: 630, channels: 4, background: { ...rgb(colors.background), alpha: 1 } } })
    .composite([{ input: overlay }, { input: art, top: Math.round((574 - info.height) / 2), left: Math.round((1200 - info.width) / 2) }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Writes a new brand set. `logo` null = no logo (only the icon, if any, is used for the icons;
 * the share card then needs a logo and is omitted). Returns the public URLs, or null when there is nothing to write.
 */
export async function writeBrandSet(
  owner: string,
  input: { logo: BrandSource | null; icon: Buffer | null; colors: { background: string; primary: string; accent: string } },
): Promise<TenantBrandAssets | null> {
  if (!/^[0-9a-f-]{36}$/.test(owner)) throw new Error("invalid upload owner");
  const iconSource = input.icon ?? input.logo?.png ?? null;
  if (!input.logo && !iconSource) return null;
  const id = randomUUID();
  const dir = path.join(uploadsDir(), owner, id);
  const url = (name: string) => `/uploads/${owner}/${id}/${name}`;
  await mkdir(dir, { recursive: true });
  try {
    const out: TenantBrandAssets = { logo: null, logoPng: null, logoSvg: null, icon32: "", icon180: "", icon192: "", icon512: "", og: null };
    if (input.logo) {
      await writeFile(path.join(dir, "logo.png"), input.logo.png);
      const webp = await sharp(input.logo.png).resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 100 }).toBuffer();
      await writeFile(path.join(dir, "logo.webp"), webp);
      out.logo = url("logo.webp");
      out.logoPng = url("logo.png");
      if (input.logo.svg) {
        await writeFile(path.join(dir, "logo.svg"), input.logo.svg);
        out.logoSvg = url("logo.svg");
      }
      await writeFile(path.join(dir, "og.png"), await ogCard(input.logo.png, input.colors));
      out.og = url("og.png");
    }
    const source = iconSource!;
    await writeFile(path.join(dir, "source.png"), await sharp(source).png().toBuffer());
    // A dedicated icon is used edge to edge; a logo gets a margin.
    const pad = input.icon ? 0 : 0.06;
    await writeFile(path.join(dir, "icon-32.png"), await squareIcon(source, 32, pad / 2, null));
    await writeFile(path.join(dir, "icon-180.png"), await squareIcon(source, 180, pad + 0.08, input.colors.background));
    await writeFile(path.join(dir, "icon-192.png"), await squareIcon(source, 192, pad + 0.12, input.colors.background));
    await writeFile(path.join(dir, "icon-512.png"), await squareIcon(source, 512, pad + 0.12, input.colors.background));
    out.icon32 = url("icon-32.png");
    out.icon180 = url("icon-180.png");
    out.icon192 = url("icon-192.png");
    out.icon512 = url("icon-512.png");
    return out;
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    throw error;
  }
}

/** Deletes a previous brand set directory of this tenant (after a successful replacement). */
export async function removeBrandSet(owner: string, assets: TenantBrandAssets | null | undefined): Promise<void> {
  const ref = assets?.icon32 || assets?.logo;
  const match = ref ? /^\/uploads\/([0-9a-f-]{36})\/([0-9a-f-]{36})\//.exec(ref) : null;
  if (!match || match[1] !== owner) return;
  await rm(path.join(uploadsDir(), owner, match[2]), { recursive: true, force: true });
}
