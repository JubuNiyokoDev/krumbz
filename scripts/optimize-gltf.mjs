#!/usr/bin/env node
/**
 * optimize-gltf — prépare un modèle glTF/GLB de produit phare pour le web.
 *
 *   node scripts/optimize-gltf.mjs <entrée.glb|.gltf> [sortie.glb] [--size 1024] [--no-ktx] [--quality 82]
 *
 * Étapes (gltf-transform) :
 *   1. dedup      — fusionne accesseurs, maillages, matériaux et textures identiques ;
 *   2. prune      — supprime nœuds, matériaux, textures et attributs inutilisés
 *                   (les matériaux référencés par KHR_materials_variants sont conservés) ;
 *   3. resample   — simplifie les pistes d'animation (sans effet s'il n'y en a pas) ;
 *   4. weld       — fusionne les sommets identiques (meilleure compression) ;
 *   5. textures   — redimensionnées (≤ --size px, puissance de deux) puis encodées en
 *                   KTX2/Basis si `toktx` (KTX-Software) est installé, sinon en WebP
 *                   (EXT_texture_webp, lu nativement par GLTFLoader de three.js) ;
 *   6. meshopt    — quantification + compression EXT_meshopt_compression
 *                   (décodeur inclus dans drei `useGLTF`, aucun fichier externe).
 *
 * Affiche la taille avant/après et le détail par ressource.
 * Sortie par défaut : <entrée>.opt.glb
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTTextureWebP, KHRTextureBasisu } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, resample, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
import sharp from "sharp";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  args.splice(index, 2);
  return value;
};
const noKtx = args.includes("--no-ktx");
if (noKtx) args.splice(args.indexOf("--no-ktx"), 1);
const maxSize = Number(flag("--size", "1024"));
const quality = Number(flag("--quality", "82"));
const [input, outputArg] = args;

if (!input || !fs.existsSync(input)) {
  console.error("Usage : node scripts/optimize-gltf.mjs <entrée.glb|.gltf> [sortie.glb] [--size 1024] [--quality 82] [--no-ktx]");
  process.exit(1);
}
const output = outputArg ?? input.replace(/\.(glb|gltf)$/i, ".opt.glb");

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} Ko`;

function hasToktx() {
  try {
    execFileSync("toktx", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Taille d'entrée : le .glb seul, ou le .gltf + ses fichiers externes. */
function inputSize(file) {
  if (/\.glb$/i.test(file)) return fs.statSync(file).size;
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  const dir = path.dirname(file);
  const uris = [...(json.buffers ?? []), ...(json.images ?? [])].map((r) => r.uri).filter((u) => u && !u.startsWith("data:"));
  return fs.statSync(file).size + uris.reduce((sum, u) => sum + fs.statSync(path.join(dir, decodeURIComponent(u))).size, 0);
}

/** Encode une texture en KTX2 (ETC1S pour la couleur, UASTC pour les normales) via toktx. */
async function toKtx2(document) {
  const basisu = document.createExtension(KHRTextureBasisu).setRequired(true);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gltf-ktx-"));
  for (const texture of document.getRoot().listTextures()) {
    const image = texture.getImage();
    if (!image) continue;
    const isNormal = document
      .getRoot()
      .listMaterials()
      .some((m) => m.getNormalTexture() === texture);
    const png = path.join(tmp, "in.png");
    const ktx = path.join(tmp, "out.ktx2");
    await sharp(image).png().toFile(png);
    const mode = isNormal ? ["--uastc", "2", "--zcmp", "18", "--assign_oetf", "linear"] : ["--bcmp", "--clevel", "4", "--qlevel", "200"];
    execFileSync("toktx", ["--t2", "--genmipmap", ...mode, ktx, png], { stdio: "ignore" });
    texture.setImage(fs.readFileSync(ktx)).setMimeType("image/ktx2");
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  return basisu;
}

async function main() {
  await MeshoptDecoder.ready;
  await MeshoptEncoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

  const before = inputSize(input);
  const document = await io.read(input);
  const ktx = !noKtx && hasToktx();

  await document.transform(
    dedup(),
    prune({ keepAttributes: false, keepLeaves: false }),
    resample(),
    weld(),
    // Redimensionne (et encode en WebP quand KTX2 n'est pas disponible).
    textureCompress({
      encoder: sharp,
      targetFormat: ktx ? "png" : "webp",
      resize: [maxSize, maxSize],
      quality,
    }),
  );
  if (ktx) await toKtx2(document);
  else document.createExtension(EXTTextureWebP).setRequired(true);
  await document.transform(meshopt({ encoder: MeshoptEncoder, level: "high" }));

  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  await io.write(output, document);
  const after = fs.statSync(output).size;

  console.log(`\n[optimize-gltf] ${input} → ${output}`);
  console.log(`  textures : ${ktx ? "KTX2 (toktx)" : "WebP (toktx introuvable ou --no-ktx)"}, ≤ ${maxSize} px`);
  for (const texture of document.getRoot().listTextures()) {
    const size = texture.getSize();
    console.log(`   · ${texture.getName() || texture.getURI() || "texture"} ${size ? size.join("×") : "?"} ${texture.getMimeType()} ${kb(texture.getImage()?.byteLength ?? 0)}`);
  }
  const variants = document.getRoot().listExtensionsUsed().map((e) => e.extensionName);
  console.log(`  extensions : ${variants.join(", ") || "aucune"}`);
  console.log(`  taille : ${kb(before)} → ${kb(after)} (−${(100 - (after / before) * 100).toFixed(0)} %)\n`);
}

main().catch((error) => {
  console.error("[optimize-gltf]", error);
  process.exit(1);
});
