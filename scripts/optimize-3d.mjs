#!/usr/bin/env node
/**
 * optimize-3d — prepares the brand textures dropped in /public for the GPU.
 *
 *   npm run optimize:3d           (Node ≥ 22.18: reads the texture list from src/lib/assets/registry.ts)
 *   npm run optimize:3d -- --force   re-encode even when outputs are up to date
 *
 * For every 3D texture of TEXTURE_KEYS that exists as a PNG
 * (sachet-front, sachet-back, carton-label, biscuit-top):
 *   1. resizes it to power-of-two dimensions (GPU-friendly mipmaps, required by Basis):
 *        sachet labels 1024×2048 (2:3 → stretched to 1:2, the UVs cover the full image),
 *        carton label 2048×1024, biscuit top 1024×1024;
 *   2. writes `<name>.webp` next to it (alpha kept for the biscuit photo);
 *   3. writes `<name>.ktx2` (Basis Universal ETC1S, sRGB, mipmaps) when `toktx`
 *      (KTX-Software) is installed — skipped with a notice otherwise;
 *   4. writes `<name>.thumb.webp` (64 px): lets the runtime compute the carton's
 *      dominant colour when the label is served as KTX2.
 *
 * src/lib/assets/server.ts → resolveTextures() then serves the KTX2, else the
 * WebP, as long as it is newer than the PNG — so replacing a PNG without
 * re-running this script still works (the PNG is used until the next run).
 * Textures are applied at runtime: no rebuild of the 3D code is needed.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { TEXTURE_KEYS } from "../src/lib/assets/registry.ts";

const root = path.resolve(import.meta.dirname, "..");
const publicDir = path.join(root, "public");
const force = process.argv.includes("--force");

/** Target power-of-two size per texture key. */
const TARGET = {
  sachetFront: [1024, 2048],
  sachetBack: [1024, 2048],
  cartonLabel: [2048, 1024],
  biscuitTop: [1024, 1024],
};

function hasToktx() {
  try {
    execFileSync("toktx", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} Ko`;
const newer = (file, than) => fs.existsSync(file) && fs.statSync(file).mtimeMs >= fs.statSync(than).mtimeMs;

async function main() {
  const ktx = hasToktx();
  if (!ktx) console.log("[optimize-3d] toktx introuvable : KTX2 ignoré, WebP uniquement (installez KTX-Software pour l’activer).");

  let found = 0;
  for (const [key, publicPath] of Object.entries(TEXTURE_KEYS)) {
    const src = path.join(publicDir, publicPath);
    if (!fs.existsSync(src) || fs.statSync(src).size === 0) {
      console.log(`[optimize-3d] ${publicPath} absent — rendu procédural utilisé.`);
      continue;
    }
    found++;
    const base = src.replace(/\.png$/i, "");
    const webpFile = `${base}.webp`;
    const ktxFile = `${base}.ktx2`;
    const thumbFile = `${base}.thumb.webp`;
    const upToDate = newer(webpFile, src) && newer(thumbFile, src) && (!ktx || newer(ktxFile, src));
    if (upToDate && !force) {
      console.log(`[optimize-3d] ${publicPath} déjà optimisé.`);
      continue;
    }

    const [width, height] = TARGET[key] ?? [1024, 1024];
    const meta = await sharp(src).metadata();
    const keepAlpha = key === "biscuitTop" && meta.hasAlpha;
    const resized = sharp(src).resize(width, height, { fit: "fill", kernel: "lanczos3" });
    const pipeline = keepAlpha ? resized : resized.flatten({ background: "#ffffff" });

    const webp = await pipeline.clone().webp({ quality: 88, alphaQuality: 90, effort: 6, smartSubsample: true }).toBuffer();
    fs.writeFileSync(webpFile, webp);
    const thumb = await sharp(src).resize(64, 64, { fit: "inside" }).webp({ quality: 70 }).toBuffer();
    fs.writeFileSync(thumbFile, thumb);
    let note = `${meta.width}×${meta.height} → ${width}×${height}, webp ${kb(webp.length)}`;

    if (ktx) {
      const tmp = path.join(os.tmpdir(), `krumbz-opt-${process.pid}-${key}.png`);
      fs.writeFileSync(tmp, await pipeline.clone().png().toBuffer());
      try {
        execFileSync(
          "toktx",
          ["--t2", "--genmipmap", "--encode", "etc1s", "--clevel", "4", "--qlevel", "220", "--assign_oetf", "srgb", ktxFile, tmp],
          { stdio: "inherit" },
        );
        note += `, ktx2 ${kb(fs.statSync(ktxFile).size)}`;
      } catch (error) {
        console.warn(`[optimize-3d] toktx a échoué pour ${publicPath} :`, error.message);
        fs.rmSync(ktxFile, { force: true });
      } finally {
        fs.rmSync(tmp, { force: true });
      }
    } else if (fs.existsSync(ktxFile) && !newer(ktxFile, src)) {
      fs.rmSync(ktxFile); // stale: would otherwise be ignored anyway, keep /public clean
    }
    console.log(`[optimize-3d] ${publicPath} : ${note}`);
  }
  if (found === 0) console.log("[optimize-3d] Aucune texture fournie : les étiquettes procédurales Krumbz sont utilisées.");
}

main().catch((error) => {
  console.error("[optimize-3d]", error);
  process.exit(1);
});
