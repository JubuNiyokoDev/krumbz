/**
 * Krumbz brand mark as an SVG string: the same round, fluted, golden biscuit
 * (with chocolate-chip docking holes) used as the header logo
 * (src/components/ui/Biscuit.tsx — the official Krumbz mark, see the real
 * packaging in public/images/story), redrawn without React so it can be
 * rasterized by the icon generator (scripts/generate-brand-icons.mjs) and the
 * Open Graph fallback card (src/app/og-fallback.png/route.tsx).
 * No imports on purpose: Node runs this file directly (type stripping).
 */
export const BRAND_COLORS = {
  cream: "#fff6e8",
  gold: "#e2a23a",
  goldLight: "#f8d58a",
  goldDark: "#b97a1c",
  rust: "#a4501a",
  navy: "#12264a",
} as const;

export interface BrandMarkOptions {
  /** Output size in px (the drawing is made on a 512 grid and scaled). */
  size?: number;
  /** Background behind the biscuit: none (transparent), cream or navy square. */
  background?: "none" | "cream" | "navy";
  /** Biscuit radius on the 512 grid (smaller leaves a safe margin, e.g. for apple-icon). */
  radius?: number;
  /** Chip holes are unreadable at 16–32 px: hide them for tiny favicons. */
  holes?: boolean;
}

/** Scalloped (fluted) circle path, deterministic — mirrors Biscuit.tsx's scallopPath. */
function scallopPath(cx: number, cy: number, r: number, bumps: number, depth: number): string {
  const pt = (angle: number, radius: number) =>
    `${(cx + Math.cos(angle) * radius).toFixed(1)} ${(cy + Math.sin(angle) * radius).toFixed(1)}`;
  const step = (Math.PI * 2) / bumps;
  let d = `M ${pt(0, r)}`;
  for (let i = 0; i < bumps; i++) d += ` Q ${pt(step * (i + 0.5), r + depth)} ${pt(step * (i + 1), r)}`;
  return `${d} Z`;
}

// Chip positions on Biscuit.tsx's 0–100 grid, as offsets from its centre (50, 50).
const CHIP_OFFSETS: [number, number][] = [
  [0, 0],
  [-14, -12],
  [14, -12],
  [-14, 12],
  [14, 12],
  [0, -22],
  [0, 22],
  [-22, 0],
  [22, 0],
];

export function brandMarkSvg({ size = 512, background = "none", radius = 240, holes = true }: BrandMarkOptions = {}): string {
  const c = BRAND_COLORS;
  const cx = 256;
  const cy = 256;
  // Biscuit.tsx draws its scallop at r=43 on a 100-grid: this scale maps that
  // drawing onto our 512-grid outer radius so every size shares one shape.
  const scale = radius / 43;
  const edge = scallopPath(cx, cy, radius, 18, 6 * scale);
  const inner = (35 * scale).toFixed(1);

  const chips = holes
    ? CHIP_OFFSETS.map(([ox, oy]) => {
        const x = (cx + ox * scale).toFixed(1);
        const y = (cy + oy * scale).toFixed(1);
        const yHi = (cy + oy * scale + 0.8 * scale).toFixed(1);
        return `<circle cx="${x}" cy="${yHi}" r="${(2.3 * scale).toFixed(1)}" fill="${c.goldLight}" opacity="0.7"/><circle cx="${x}" cy="${y}" r="${(2.1 * scale).toFixed(1)}" fill="${c.rust}" opacity="0.75"/>`;
      }).join("")
    : "";

  const shineCx = (cx - 12 * scale).toFixed(1);
  const shineCy = (cy - 20 * scale).toFixed(1);
  const shine = `<ellipse cx="${shineCx}" cy="${shineCy}" rx="${(13 * scale).toFixed(1)}" ry="${(6 * scale).toFixed(1)}" fill="#fff" opacity="0.22" transform="rotate(-25 ${shineCx} ${shineCy})"/>`;

  const bg =
    background === "none"
      ? ""
      : `<rect width="512" height="512" fill="${background === "cream" ? c.cream : c.navy}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
<defs>
<radialGradient id="crust" cx="40%" cy="35%" r="70%">
<stop offset="0%" stop-color="${c.goldLight}"/>
<stop offset="55%" stop-color="${c.gold}"/>
<stop offset="100%" stop-color="${c.goldDark}"/>
</radialGradient>
<radialGradient id="inner" cx="45%" cy="40%" r="60%">
<stop offset="0%" stop-color="#f6c56a"/>
<stop offset="100%" stop-color="#d99332"/>
</radialGradient>
</defs>
${bg}
<path d="${edge}" fill="url(#crust)"/>
<circle cx="${cx}" cy="${cy}" r="${inner}" fill="url(#inner)"/>
<circle cx="${cx}" cy="${cy}" r="${inner}" fill="none" stroke="${c.goldDark}" stroke-opacity="0.45" stroke-width="${(1.2 * scale).toFixed(1)}"/>
${chips}
${shine}
</svg>`;
}
