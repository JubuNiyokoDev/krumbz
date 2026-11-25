/**
 * RundiNova Tech brand assets from the owner's logo (public/brand/rundinova-tech-logo-source.jpg, white background):
 *
 *   public/brand/rundinova-logo.png      full logo (RN mark + « RundiNova Tech »), transparent
 *   public/brand/rundinova-mark.png      RN mark only, transparent
 *   public/brand/rundinova-mark-white.png  RN mark in white (dark backgrounds)
 *   public/brand/rn-icon-32.png / rn-icon-180.png / rn-icon-192.png / rn-icon-512.png  favicons (marketing site)
 *   public/brand/rundinova-og.png        1200 × 630 share card
 *
 * White → alpha ("colour to alpha"): alpha from the distance to white, colours un-blended, so anti-aliased
 * edges stay clean on any background.   node scripts/brand-rundinova.mjs
 */
import sharp from "sharp";

const SRC = "public/brand/rundinova-tech-logo-source.jpg";
const OUT = "public/brand";

async function whiteToAlpha(input) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const d = 255 - Math.min(r, g, b);
    const a = Math.max(0, Math.min(1, (d - 12) / (225 - 12)));
    if (a === 0) continue;
    const un = (c) => Math.max(0, Math.min(255, Math.round((c - (1 - a) * 255) / a)));
    out[j] = un(r);
    out[j + 1] = un(g);
    out[j + 2] = un(b);
    out[j + 3] = Math.round(a * 255);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

const trim = (buf) => sharp(buf).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 }).png({ compressionLevel: 9 }).toBuffer();

const meta = await sharp(SRC).metadata();
const transparent = await whiteToAlpha(SRC);
const full = await trim(transparent);
await sharp(full).toFile(`${OUT}/rundinova-logo.png`);

// The mark sits above the wordmark (wordmark starts at ~62 % of the height).
const markRegion = await sharp(transparent).extract({ left: 0, top: 0, width: meta.width, height: Math.round(meta.height * 0.615) }).png().toBuffer();
const mark = await trim(markRegion);
await sharp(mark).toFile(`${OUT}/rundinova-mark.png`);

// White version of the mark (alpha kept).
const { data: md, info: mi } = await sharp(mark).raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < md.length; i += 4) md[i] = md[i + 1] = md[i + 2] = 255;
await sharp(md, { raw: { width: mi.width, height: mi.height, channels: 4 } }).png().toFile(`${OUT}/rundinova-mark-white.png`);

async function icon(size, pad, background) {
  const inner = Math.round(size * (1 - 2 * pad));
  const art = await sharp(mark).resize({ width: inner, height: inner, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } }).composite([{ input: art, gravity: "centre" }]).png({ compressionLevel: 9 }).toBuffer();
}
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
const white = { r: 255, g: 255, b: 255, alpha: 1 };
await sharp(await icon(32, 0.02, clear)).toFile(`${OUT}/rn-icon-32.png`);
await sharp(await icon(180, 0.14, white)).toFile(`${OUT}/rn-icon-180.png`);
await sharp(await icon(192, 0.16, white)).toFile(`${OUT}/rn-icon-192.png`);
await sharp(await icon(512, 0.16, white)).toFile(`${OUT}/rn-icon-512.png`);

// Share card: white, logo centred, blue rule and cyan accent.
const art = await sharp(full).resize({ width: 640, height: 420, fit: "inside" }).png().toBuffer({ resolveWithObject: true });
const overlay = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs><radialGradient id="g" cx="0.85" cy="0.1" r="0.6"><stop offset="0" stop-color="#08B8F0" stop-opacity="0.18"/><stop offset="1" stop-color="#08B8F0" stop-opacity="0"/></radialGradient></defs>
    <rect width="1200" height="630" fill="url(#g)"/>
    <rect x="0" y="598" width="1200" height="32" fill="#0008B8"/><rect x="0" y="590" width="1200" height="8" fill="#08B8F0"/>
  </svg>`,
);
await sharp({ create: { width: 1200, height: 630, channels: 4, background: white } })
  .composite([{ input: overlay }, { input: art.data, top: Math.round((590 - art.info.height) / 2), left: Math.round((1200 - art.info.width) / 2) }])
  .png({ compressionLevel: 9 })
  .toFile(`${OUT}/rundinova-og.png`);

console.log("[brand] RundiNova Tech assets written to public/brand/");
