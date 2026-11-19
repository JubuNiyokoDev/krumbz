import {
  CanvasTexture,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RedFormat,
  RGBAFormat,
  SRGBColorSpace,
  TextureLoader,
  UnsignedByteType,
  type Texture,
  type WebGLRenderer,
} from "three";
import type { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

/** Basis Universal transcoder copied by scripts/copy-vendor.mjs. */
const BASIS_PATH = "/basis/";

let ktx2: { loader: KTX2Loader; renderer: WebGLRenderer } | null = null;

async function ktx2Loader(renderer: WebGLRenderer): Promise<KTX2Loader> {
  if (ktx2?.renderer === renderer) return ktx2.loader;
  ktx2?.loader.dispose();
  const { KTX2Loader } = await import("three/examples/jsm/loaders/KTX2Loader.js");
  const loader = new KTX2Loader().setTranscoderPath(BASIS_PATH).detectSupport(renderer);
  ktx2 = { loader, renderer };
  return loader;
}

/** Releases the KTX2 transcoder workers (call when the renderer is disposed). */
export function disposeTextureLoaders() {
  ktx2?.loader.dispose();
  ktx2 = null;
}

export const isKtx2 = (url: string) => /\.ktx2(\?|$)/i.test(url);

export interface LoadOptions {
  srgb: boolean;
  anisotropy?: number;
}

/** Loads a texture from a WebP/PNG/JPEG or KTX2 URL with sensible GPU settings. */
export async function loadTexture(url: string, renderer: WebGLRenderer, { srgb, anisotropy = 4 }: LoadOptions): Promise<Texture> {
  let texture: Texture;
  if (isKtx2(url)) {
    const loader = await ktx2Loader(renderer);
    texture = await loader.loadAsync(url);
  } else {
    texture = await new TextureLoader().loadAsync(url);
    texture.generateMipmaps = true;
    texture.minFilter = LinearMipmapLinearFilter;
  }
  texture.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  texture.magFilter = LinearFilter;
  texture.anisotropy = Math.min(anisotropy, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  return texture;
}

export function canvasTexture(source: HTMLCanvasElement, renderer: WebGLRenderer, srgb = true, anisotropy = 4): CanvasTexture {
  const texture = new CanvasTexture(source);
  texture.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  texture.anisotropy = Math.min(anisotropy, renderer.capabilities.getMaxAnisotropy());
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

/** Wraps raw single-channel or RGB bytes (runtime bake fallback) in a DataTexture. */
export function dataTexture(bytes: Uint8Array, size: number, channels: 1 | 3, srgb: boolean): DataTexture {
  // Rows were produced top-down (row 0 = far edge = v 1); DataTexture rows go bottom-up.
  const out = channels === 3 ? 4 : 1;
  const data = new Uint8Array(size * size * out);
  for (let y = 0; y < size; y++) {
    const srcRow = (size - 1 - y) * size;
    const dstRow = y * size;
    for (let x = 0; x < size; x++) {
      const s = (srcRow + x) * channels;
      const d = (dstRow + x) * out;
      data[d] = bytes[s];
      if (out === 4) {
        data[d + 1] = bytes[s + 1];
        data[d + 2] = bytes[s + 2];
        data[d + 3] = 255;
      }
    }
  }
  const texture = new DataTexture(data, size, size, out === 4 ? RGBAFormat : RedFormat, UnsignedByteType);
  texture.flipY = false;
  texture.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Image element behind a loaded (non-KTX2) texture, if any. */
export function textureImage(texture: Texture | null): CanvasImageSource | null {
  const image = texture?.image as unknown;
  if (typeof HTMLImageElement !== "undefined" && image instanceof HTMLImageElement) return image;
  if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) return image;
  if (typeof HTMLCanvasElement !== "undefined" && image instanceof HTMLCanvasElement) return image;
  return null;
}

/**
 * Dominant colour of an image (quantised histogram of a 48 px thumbnail,
 * ignoring transparent and near-white/near-black pixels). Hex string.
 */
export function dominantColor(image: CanvasImageSource, fallback = "#e2a23a"): string {
  try {
    const size = 48;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return fallback;
    ctx.drawImage(image, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a < 200) continue;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max > 245 && min > 235) continue;
      if (max < 12) continue;
      const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      bucket.n++;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      buckets.set(key, bucket);
    }
    let best: { n: number; r: number; g: number; b: number } | null = null;
    for (const bucket of buckets.values()) if (!best || bucket.n > best.n) best = bucket;
    if (!best) return fallback;
    const hex = (v: number) => Math.round(v / best!.n).toString(16).padStart(2, "0");
    return `#${hex(best.r)}${hex(best.g)}${hex(best.b)}`;
  } catch {
    return fallback;
  }
}

/** Loads an image element (used for KTX2 label thumbnails). */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`image: ${url}`));
    image.src = url;
  });
}
