/**
 * Biscuit relief baking — single source of truth for the MARIE biscuit surface.
 *
 * Shared by:
 * - `scripts/build-3d.mjs` (Node, sharp rasterises the SVG, outputs WebP/KTX2
 *   into /public/models at build time — the normal path);
 * - the browser fallback in `src/lib/three/assets.ts` (canvas rasterises the
 *   same SVG when the baked files are missing).
 *
 * The module is dependency-free and uses only erasable TypeScript so that
 * Node ≥ 22.18 can import it directly (type stripping).
 *
 * Texture space: the biscuit disc fills the square texture (centre = 0.5,
 * radius = 0.5 in UV). Image row 0 is the far edge of the biscuit (v = 1).
 */

/** Neutral height (no displacement). Values above are raised, below recessed. */
export const BASE_HEIGHT = 0.5;

/** Docking holes, in normalised disc coordinates (radius 1, y down). 28 holes in staggered rows. */
export const DOCKING_HOLES: ReadonlyArray<readonly [number, number]> = (() => {
  const holes: [number, number][] = [];
  const rows: [number, number[]][] = [
    [-0.62, [-0.2, 0, 0.2]],
    [-0.46, [-0.36, -0.18, 0, 0.18, 0.36]],
    [-0.29, [-0.45, -0.27, -0.09, 0.09, 0.27, 0.45]],
    [0.29, [-0.45, -0.27, -0.09, 0.09, 0.27, 0.45]],
    [0.46, [-0.36, -0.18, 0, 0.18, 0.36]],
    [0.62, [-0.2, 0, 0.2]],
  ];
  for (const [y, xs] of rows) for (const x of xs) holes.push([x, y]);
  return holes;
})();

const gray = (value: number) => {
  const v = Math.round(Math.min(1, Math.max(0, value)) * 255);
  return `rgb(${v},${v},${v})`;
};

/**
 * Serif capitals drawn as strokes in a 100 × 124 cell (y down), like the
 * pressed lettering of a Marie biscuit. Each entry: advance width + SVG path.
 */
const LETTERS: Record<string, { advance: number; path: string; serifs: string }> = {
  M: {
    advance: 112,
    path: "M8 124 L16 2 L52 96 L88 2 L96 124",
    serifs: "M-4 124 H22 M82 124 H108 M2 2 H22 M82 2 H102",
  },
  A: {
    advance: 104,
    path: "M4 124 L50 0 L96 124 M24 80 H76",
    serifs: "M-8 124 H18 M82 124 H108 M38 1 H62",
  },
  R: {
    advance: 100,
    path: "M12 0 V124 M12 2 H52 A30 30 0 0 1 52 64 H12 M46 64 L90 124",
    serifs: "M0 124 H26 M0 2 H14 M80 124 H100",
  },
  I: {
    advance: 52,
    path: "M26 0 V124",
    serifs: "M10 2 H42 M10 122 H42",
  },
  E: {
    advance: 92,
    path: "M12 0 V124 M12 2 H82 M12 62 H66 M12 122 H86",
    serifs: "M0 124 H14 M0 2 H14 M82 -6 V14 M86 108 V124 M66 52 V72",
  },
};

/**
 * SVG height pattern of the biscuit top (grayscale: 50 % = neutral surface).
 * Rasterised by sharp in Node and by canvas in the browser.
 */
export function biscuitPatternSvg(size = 1024, word = "MARIE"): string {
  const c = size / 2;
  const R = size / 2;
  const at = (n: number) => (c + n * R).toFixed(2);
  const parts: string[] = [];

  // Raised decorative border: plateau with a scalloped inner edge.
  const band: string[] = [];
  const steps = 360;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = 0.905;
    band.push(`${i === 0 ? "M" : "L"}${at(Math.cos(a) * r)} ${at(Math.sin(a) * r)}`);
  }
  for (let i = steps; i >= 0; i--) {
    const a = (i / steps) * Math.PI * 2;
    const r = 0.808 + 0.014 * Math.cos(a * 36);
    band.push(`L${at(Math.cos(a) * r)} ${at(Math.sin(a) * r)}`);
  }
  parts.push(`<path d="${band.join(" ")}Z" fill="${gray(0.7)}" fill-rule="evenodd"/>`);

  // Bead ring on the border (small domes).
  const beads = 36;
  for (let i = 0; i < beads; i++) {
    const a = ((i + 0.5) / beads) * Math.PI * 2;
    parts.push(
      `<circle cx="${at(Math.cos(a) * 0.857)}" cy="${at(Math.sin(a) * 0.857)}" r="${(0.026 * R).toFixed(2)}" fill="url(#bead)"/>`,
    );
  }

  // Thin inner ring.
  parts.push(
    `<circle cx="${c}" cy="${c}" r="${(0.752 * R).toFixed(2)}" fill="none" stroke="${gray(0.66)}" stroke-width="${(0.013 * R).toFixed(2)}"/>`,
  );

  // Docking holes.
  for (const [x, y] of DOCKING_HOLES) {
    parts.push(`<circle cx="${at(x)}" cy="${at(y)}" r="${(0.024 * R).toFixed(2)}" fill="url(#hole)"/>`);
  }

  // Lettering (centred).
  const letters = [...word.toUpperCase()].filter((ch) => LETTERS[ch]);
  const spacing = 18;
  const total = letters.reduce((sum, ch) => sum + LETTERS[ch].advance, 0) + spacing * (letters.length - 1);
  const textWidth = 1.06 * R; // ~ 53 % of the diameter
  const scale = textWidth / total;
  let pen = c - textWidth / 2;
  const top = c - 62 * scale;
  for (const ch of letters) {
    const L = LETTERS[ch];
    parts.push(
      `<g transform="translate(${pen.toFixed(2)} ${top.toFixed(2)}) scale(${scale.toFixed(4)})">` +
        `<path d="${L.path}" fill="none" stroke="${gray(0.8)}" stroke-width="17" stroke-linecap="butt" stroke-linejoin="round"/>` +
        `<path d="${L.serifs}" fill="none" stroke="${gray(0.8)}" stroke-width="9" stroke-linecap="round"/>` +
        `</g>`,
    );
    pen += (L.advance + spacing) * scale;
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<defs>` +
    `<radialGradient id="bead"><stop offset="0" stop-color="${gray(0.86)}"/><stop offset="0.7" stop-color="${gray(0.78)}"/><stop offset="1" stop-color="${gray(0.7)}"/></radialGradient>` +
    `<radialGradient id="hole"><stop offset="0" stop-color="${gray(0.06)}"/><stop offset="0.65" stop-color="${gray(0.14)}"/><stop offset="1" stop-color="${gray(0.5)}"/></radialGradient>` +
    `</defs>` +
    `<rect width="${size}" height="${size}" fill="${gray(BASE_HEIGHT)}"/>` +
    parts.join("") +
    `</svg>`
  );
}

// ---------------------------------------------------------------------------
// Noise
// ---------------------------------------------------------------------------

function hash2(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Fractal value noise in [0, 1]. */
export function fbm(x: number, y: number, octaves = 4, seed = 7): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * f, y * f, seed + i * 17) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

// ---------------------------------------------------------------------------
// Field processing
// ---------------------------------------------------------------------------

/** Separable box blur (3 passes ≈ gaussian), in place on a copy. */
export function blurField(src: Float32Array, size: number, radius: number, passes = 3): Float32Array {
  if (radius < 1) return src.slice();
  const a = src.slice();
  const b = new Float32Array(src.length);
  const r = Math.round(radius);
  const win = 2 * r + 1;
  for (let p = 0; p < passes; p++) {
    // horizontal
    for (let y = 0; y < size; y++) {
      const row = y * size;
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += a[row + Math.min(size - 1, Math.max(0, k))];
      for (let x = 0; x < size; x++) {
        b[row + x] = acc / win;
        const add = a[row + Math.min(size - 1, x + r + 1)];
        const sub = a[row + Math.max(0, x - r)];
        acc += add - sub;
      }
    }
    // vertical
    for (let x = 0; x < size; x++) {
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += b[Math.min(size - 1, Math.max(0, k)) * size + x];
      for (let y = 0; y < size; y++) {
        a[y * size + x] = acc / win;
        const add = b[Math.min(size - 1, y + r + 1) * size + x];
        const sub = b[Math.max(0, y - r) * size + x];
        acc += add - sub;
      }
    }
  }
  return a;
}

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export interface ReliefMaps {
  size: number;
  /** 1 channel, displacement (0.5 = neutral). */
  height: Uint8Array;
  /** 3 channels, tangent-space normal map (OpenGL convention, +Y up). */
  normal: Uint8Array;
  /** 3 channels, sRGB golden-baked colour. */
  color: Uint8Array;
}

/**
 * Turns the rasterised SVG pattern into height, normal and colour maps.
 * `pixels` holds `channels` bytes per pixel (only the first channel is read).
 */
export function processRelief(pixels: ArrayLike<number>, size: number, channels: number): ReliefMaps {
  const n = size * size;
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) raw[i] = pixels[i * channels] / 255;

  const px = size / 1024; // feature scale relative to the 1024 reference
  const h = blurField(raw, size, 1.6 * px); // rounded relief
  const hWide = blurField(h, size, 10 * px); // for cavity / ridge detection

  // Height (displacement): neutral outside the disc so the rim stays clean.
  const height = new Uint8Array(n);
  // Detail field for the normal map: relief + dough micro texture.
  const detail = new Float32Array(n);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const nx = (x + 0.5) / size - 0.5;
      const ny = (y + 0.5) / size - 0.5;
      const r = Math.sqrt(nx * nx + ny * ny) * 2;
      const edge = 1 - smoothstep(0.93, 0.97, r);
      const value = BASE_HEIGHT + (h[i] - BASE_HEIGHT) * edge;
      height[i] = Math.round(Math.min(1, Math.max(0, value)) * 255);
      const u = x / size;
      const v = y / size;
      const grain = (fbm(u * 70, v * 70, 3, 11) - 0.5) * 0.035 + (fbm(u * 190, v * 190, 2, 23) - 0.5) * 0.018;
      // tiny bubble pits of baked dough
      const pit = hash2(Math.floor(u * 260), Math.floor(v * 260), 5) > 0.985 ? -0.03 : 0;
      detail[i] = value + (grain + pit) * (1 - smoothstep(0.96, 1.0, r));
    }
  }
  const detailSoft = blurField(detail, size, 0.8 * px, 1);

  // Normal map (Sobel). Strength exaggerates the physical slope slightly for legibility.
  const normal = new Uint8Array(n * 3);
  const strength = 14 * (size / 1024);
  const at = (x: number, y: number) =>
    detailSoft[Math.min(size - 1, Math.max(0, y)) * size + Math.min(size - 1, Math.max(0, x))];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)) /
        8;
      // rows grow downwards while v grows upwards
      const dy =
        -(at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) /
        8;
      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const o = (y * size + x) * 3;
      normal[o] = Math.round((nx * 0.5 + 0.5) * 255);
      normal[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      normal[o + 2] = Math.round((nz * 0.5 + 0.5) * 255);
    }
  }

  // Colour: golden dough, toasted rim and peaks, darker cavities, speckles.
  const color = new Uint8Array(n * 3);
  const light = [242, 204, 132];
  const base = [226, 170, 92];
  const toasted = [186, 112, 46];
  const deep = [128, 70, 28];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const u = x / size;
      const v = y / size;
      const nx = u + 0.5 / size - 0.5;
      const ny = v + 0.5 / size - 0.5;
      const r = Math.min(1.2, Math.sqrt(nx * nx + ny * ny) * 2);
      const cavity = Math.min(1, Math.max(0, (hWide[i] - h[i]) * 5));
      const ridge = Math.min(1, Math.max(0, (h[i] - hWide[i]) * 4.5));
      const mottling = fbm(u * 5, v * 5, 4, 3);
      const grain = fbm(u * 48, v * 48, 3, 9);
      const raised = Math.max(0, h[i] - BASE_HEIGHT) * 2;
      let toast =
        0.12 +
        0.62 * smoothstep(0.8, 1.0, r) +
        0.3 * ridge +
        0.2 * raised +
        0.32 * (mottling - 0.5) +
        0.12 * (grain - 0.5);
      toast = Math.min(1, Math.max(0, toast));
      const lightMix = Math.min(1, Math.max(0, 0.45 + (grain - 0.5) * 0.7 - toast * 0.4));
      const o = i * 3;
      for (let c = 0; c < 3; c++) {
        let col = mix(base[c], light[c], lightMix);
        col = mix(col, toasted[c], toast);
        col = mix(col, deep[c], cavity * 0.75);
        color[o + c] = col;
      }
      // dark baked speckles
      if (hash2(Math.floor(u * 420), Math.floor(v * 420), 31) > 0.998) {
        for (let c = 0; c < 3; c++) color[o + c] = Math.round(color[o + c] * 0.72);
      }
    }
  }

  return { size, height, normal, color };
}
