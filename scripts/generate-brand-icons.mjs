#!/usr/bin/env node
/**
 * Génère les icônes du site à partir de la marque Krumbz (src/components/seo/brandMark.ts) :
 *   src/app/icon.png        512 × 512, fond transparent (onglet, Android, Google)
 *   src/app/apple-icon.png  180 × 180, fond crème (écran d'accueil iOS)
 *   src/app/favicon.ico     16 + 32 + 48 px (anciens navigateurs, /favicon.ico)
 *
 *   npm run icons
 *
 * Next.js détecte ces fichiers (conventions icon / apple-icon / favicon) et
 * ajoute les balises <link> automatiquement. Quand le logo officiel sera
 * fourni, remplacer ces trois fichiers (mêmes noms, mêmes tailles).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { brandMarkSvg } = await import(new URL("../src/components/seo/brandMark.ts", import.meta.url).href);
const appDir = path.join(root, "src/app");

const png = (svg, size) =>
  sharp(Buffer.from(svg), { density: 72 * (size / 512) * 4 })
    .resize(size, size)
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
    .toBuffer();

/** ICO container with PNG-compressed entries (supported by every browser since IE Vista era). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const outputs = [];

const icon = await png(brandMarkSvg({ size: 512 }), 512);
await fs.writeFile(path.join(appDir, "icon.png"), icon);
outputs.push(["src/app/icon.png", "512×512", icon.length]);

// iOS ignores transparency (black background): opaque cream square with a safe margin.
const apple = await png(brandMarkSvg({ size: 180, background: "cream", radius: 200 }), 180);
await fs.writeFile(path.join(appDir, "apple-icon.png"), apple);
outputs.push(["src/app/apple-icon.png", "180×180", apple.length]);

const icoImages = [];
for (const size of [16, 32, 48]) {
  icoImages.push({ size, data: await png(brandMarkSvg({ size, holes: size >= 48, radius: 250 }), size) });
}
const favicon = ico(icoImages);
await fs.writeFile(path.join(appDir, "favicon.ico"), favicon);
outputs.push(["src/app/favicon.ico", "16+32+48", favicon.length]);

for (const [file, dims, bytes] of outputs) console.log(`✓ ${file.padEnd(24)} ${dims.padEnd(9)} ${(bytes / 1024).toFixed(1)} Ko`);
