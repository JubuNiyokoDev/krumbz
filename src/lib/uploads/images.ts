import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type Metadata } from "sharp";

/**
 * Uploaded images (docs/plan.md §2): sharp → WebP + AVIF in 3 widths, EXIF removed (sharp drops
 * metadata unless asked), auto-rotated. Files live in UPLOADS_DIR/<owner>/<id>/<width>.<ext> and are
 * served by src/app/uploads/[...path]/route.ts with an immutable Cache-Control (new upload = new id).
 *
 * <owner> is a tenant id, or "platform" for super-admin assets that belong to no vendor.
 */

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const WIDTHS = [480, 960, 1600] as const;
const ACCEPTED = new Set(["jpeg", "png", "webp", "avif", "heif", "gif", "tiff"]);
const OWNER_PATTERN = /^(platform|[0-9a-f-]{36})$/;

export function uploadsDir(): string {
  return path.resolve(process.env.UPLOADS_DIR ?? path.join(process.cwd(), ".data", "uploads"));
}

export interface StoredImage {
  /** Storage key relative to the owner directory, e.g. "<id>". */
  key: string;
  /** Public URL of the largest WebP variant (the default <img src>). */
  url: string;
  width: number;
  height: number;
  bytes: number;
  mime: "image/webp";
  variants: Record<string, string>;
}

export class UploadError extends Error {
  constructor(public code: "too_large" | "not_image" | "empty") {
    super(code);
  }
}

export async function storeImage(owner: string, file: File | Buffer, options: { maxWidth?: number } = {}): Promise<StoredImage> {
  if (!OWNER_PATTERN.test(owner)) throw new Error("invalid upload owner");
  const input = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer());
  if (!input.length) throw new UploadError("empty");
  if (input.length > MAX_UPLOAD_BYTES) throw new UploadError("too_large");

  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw new UploadError("not_image");
  }
  if (!meta.format || !ACCEPTED.has(meta.format)) throw new UploadError("not_image");

  const id = randomUUID();
  const dir = path.join(uploadsDir(), owner, id);
  await mkdir(dir, { recursive: true });

  const base = sharp(input, { limitInputPixels: 50_000_000 }).rotate();
  const { width: srcWidth = 0, height: srcHeight = 0 } = await base.clone().toBuffer({ resolveWithObject: true }).then((r) => r.info);
  const maxWidth = Math.min(options.maxWidth ?? WIDTHS[WIDTHS.length - 1], srcWidth || WIDTHS[0]);
  const widths = Array.from(new Set([...WIDTHS.filter((w) => w < maxWidth), maxWidth]));

  const variants: Record<string, string> = {};
  let bytes = 0;
  let largest = { width: 0, height: 0 };
  try {
    for (const width of widths) {
      const resized = base.clone().resize({ width, withoutEnlargement: true });
      const webp = await resized.clone().webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
      const avif = await resized.clone().avif({ quality: 55 }).toBuffer();
      await writeFile(path.join(dir, `${width}.webp`), webp.data);
      await writeFile(path.join(dir, `${width}.avif`), avif);
      variants[`${width}.webp`] = `/uploads/${owner}/${id}/${width}.webp`;
      variants[`${width}.avif`] = `/uploads/${owner}/${id}/${width}.avif`;
      bytes += webp.data.length + avif.length;
      largest = { width: webp.info.width, height: webp.info.height };
    }
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    throw error;
  }
  const top = widths[widths.length - 1];
  return {
    key: id,
    url: `/uploads/${owner}/${id}/${top}.webp`,
    width: largest.width || srcWidth,
    height: largest.height || srcHeight,
    bytes,
    mime: "image/webp",
    variants,
  };
}

/** Deletes the files of an upload (the database row is removed by the caller). */
export async function removeStoredImage(owner: string, key: string): Promise<void> {
  if (!OWNER_PATTERN.test(owner) || !/^[0-9a-f-]{36}$/.test(key)) return;
  await rm(path.join(uploadsDir(), owner, key), { recursive: true, force: true });
}
