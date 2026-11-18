// Copies third-party runtime assets into /public so nothing is fetched from a CDN:
// - detect-gpu benchmark data (one small JSON fetched per device family)
// - Basis Universal transcoder (decodes KTX2 textures on the GPU)
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const copies = [
  ["node_modules/detect-gpu/dist/benchmarks", "public/vendor/detect-gpu"],
  ["node_modules/three/examples/jsm/libs/basis", "public/basis"],
];

for (const [from, to] of copies) {
  const src = path.join(root, from);
  const dest = path.join(root, to);
  if (!fs.existsSync(src)) {
    console.warn(`[copy-vendor] introuvable : ${from}`);
    continue;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(src)) {
    if (file.endsWith(".md")) continue;
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }
  console.log(`[copy-vendor] ${from} → ${to}`);
}
