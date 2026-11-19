#!/usr/bin/env node
/**
 * build-3d — bakes the procedural biscuit relief maps used by the 3D scenes.
 *
 *   npm run build:3d            (Node ≥ 22.18: imports the shared .ts bake module)
 *
 * Why bake at build time: the MARIE lettering, bead border and 28 docking holes
 * are rasterised from an SVG (sharp/librsvg, no font dependency: the letters
 * are stroked paths), blurred, turned into a normal map with a Sobel filter and
 * coloured with fractal noise. That is ~150 ms of CPU per 1 MP map: free here,
 * expensive on a mid-range phone. The browser re-uses the very same module
 * (src/lib/three/bake/biscuitRelief.ts) only as a fallback if the files are gone.
 *
 * Geometry stays runtime-procedural (src/lib/three/geometry/*): a few kB of
 * code generate the biscuit, the pillow pack (with its opening morph targets)
 * and the carton, adapted to the GPU tier — lighter than any GLB download.
 *
 * Outputs (public/models):
 *   biscuit-height.webp   512²  lossless grayscale  → displacementMap
 *   biscuit-normal.webp   1024² q90                → normalMap
 *   biscuit-color.webp    1024² q86                 → map (used when /images/product/biscuit-top.png is absent)
 *   *.ktx2                same maps, Basis Universal (UASTC for normal/height, ETC1S for colour)
 *                         — only when `toktx` (KTX-Software) is on the PATH; skipped otherwise.
 * and src/lib/three/baked.ts, the manifest imported by the runtime (URLs with
 * a content hash for cache busting; KTX2 preferred when present).
 */
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { biscuitPatternSvg, processRelief } from "../src/lib/three/bake/biscuitRelief.ts";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "public/models");
const manifestFile = path.join(root, "src/lib/three/baked.ts");
const SIZE = 1024;

function hasToktx() {
  try {
    execFileSync("toktx", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function hash(buffer) {
  return crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 10);
}

/** Encodes a PNG with toktx into KTX2 (Basis Universal). Returns the output path or null. */
function toKtx2(pngBuffer, outFile, { mode, srgb }) {
  const tmp = path.join(os.tmpdir(), `krumbz-${process.pid}-${path.basename(outFile, ".ktx2")}.png`);
  fs.writeFileSync(tmp, pngBuffer);
  const args = ["--t2", "--genmipmap", "--assign_oetf", srgb ? "srgb" : "linear"];
  if (mode === "uastc") args.push("--encode", "uastc", "--uastc_quality", "2", "--zcmp", "18");
  else args.push("--encode", "etc1s", "--clevel", "4", "--qlevel", "200");
  if (!srgb) args.push("--assign_primaries", "none");
  try {
    execFileSync("toktx", [...args, outFile, tmp], { stdio: "inherit" });
    return outFile;
  } catch (error) {
    console.warn(`[build-3d] toktx a échoué pour ${path.basename(outFile)} :`, error.message);
    return null;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

async function main() {
  const t0 = performance.now();
  fs.mkdirSync(outDir, { recursive: true });

  const svg = biscuitPatternSvg(SIZE);
  const { data, info } = await sharp(Buffer.from(svg)).greyscale().raw().toBuffer({ resolveWithObject: true });
  const maps = processRelief(data, SIZE, info.channels);

  const raw = (channels) => ({ raw: { width: SIZE, height: SIZE, channels } });
  const outputs = {
    biscuitHeight: {
      file: "biscuit-height",
      image: sharp(Buffer.from(maps.height), raw(1)).resize(512, 512, { kernel: "lanczos3" }),
      webp: { lossless: true },
      ktx: { mode: "uastc", srgb: false },
    },
    biscuitNormal: {
      file: "biscuit-normal",
      image: sharp(Buffer.from(maps.normal), raw(3)),
      webp: { quality: 90, smartSubsample: false },
      ktx: { mode: "uastc", srgb: false },
    },
    biscuitColor: {
      file: "biscuit-color",
      image: sharp(Buffer.from(maps.color), raw(3)),
      webp: { quality: 86, smartSubsample: true },
      ktx: { mode: "etc1s", srgb: true },
    },
  };

  const ktx = hasToktx();
  if (!ktx) console.log("[build-3d] toktx introuvable : KTX2 ignoré, WebP uniquement.");

  const manifest = {};
  let total = 0;
  for (const [key, spec] of Object.entries(outputs)) {
    const webpBuffer = await spec.image.clone().webp({ effort: 6, ...spec.webp }).toBuffer();
    const webpFile = path.join(outDir, `${spec.file}.webp`);
    fs.writeFileSync(webpFile, webpBuffer);
    total += webpBuffer.length;
    let url = `/models/${spec.file}.webp?v=${hash(webpBuffer)}`;
    let note = `${(webpBuffer.length / 1024).toFixed(0)} Ko webp`;

    const ktxFile = path.join(outDir, `${spec.file}.ktx2`);
    if (ktx) {
      const png = await spec.image.clone().png().toBuffer();
      if (toKtx2(png, ktxFile, spec.ktx)) {
        const ktxBuffer = fs.readFileSync(ktxFile);
        url = `/models/${spec.file}.ktx2?v=${hash(ktxBuffer)}`;
        note += `, ${(ktxBuffer.length / 1024).toFixed(0)} Ko ktx2`;
      }
    } else if (fs.existsSync(ktxFile)) {
      fs.rmSync(ktxFile); // stale KTX2 from a previous bake would not match the new WebP
    }
    manifest[key] = url;
    console.log(`[build-3d] ${spec.file} → ${note}`);
  }

  const source = `// GENERATED by scripts/build-3d.mjs — do not edit. Run \`npm run build:3d\` to regenerate.
/** Baked biscuit relief maps (see src/lib/three/bake/biscuitRelief.ts). */
export const BAKED_MAPS = ${JSON.stringify(manifest, null, 2)} as const;
`;
  fs.writeFileSync(manifestFile, source);
  console.log(
    `[build-3d] ${(total / 1024).toFixed(0)} Ko au total, manifeste ${path.relative(root, manifestFile)} — ${Math.round(performance.now() - t0)} ms`,
  );
}

main().catch((error) => {
  console.error("[build-3d]", error);
  process.exit(1);
});
