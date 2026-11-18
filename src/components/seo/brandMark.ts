/**
 * Krumbz brand mark as an SVG string: a golden biscuit disc with docking holes
 * and a rounded "K". Shared by the icon generator (scripts/generate-brand-icons.mjs)
 * and the Open Graph fallback card (src/app/og-fallback.png/route.tsx).
 * No imports on purpose: Node runs this file directly (type stripping).
 */
export const BRAND_COLORS = {
  cream: "#fff6e8",
  gold: "#e2a23a",
  goldLight: "#f2c46a",
  goldDark: "#b8741f",
  rust: "#a4501a",
  navy: "#12264a",
} as const;

export interface BrandMarkOptions {
  /** Output size in px (the drawing is made on a 512 grid and scaled). */
  size?: number;
  /** Background behind the disc: none (transparent), cream or navy square. */
  background?: "none" | "cream" | "navy";
  /** Disc radius on the 512 grid (smaller leaves a safe margin, e.g. for apple-icon). */
  radius?: number;
  /** Docking holes are unreadable at 16–32 px: hide them for tiny favicons. */
  holes?: boolean;
}

export function brandMarkSvg({ size = 512, background = "none", radius = 240, holes = true }: BrandMarkOptions = {}): string {
  const c = BRAND_COLORS;
  const cx = 256;
  const cy = 256;
  const r = radius;
  const k = r / 240; // scale of the inner drawing relative to the default disc

  // Docking holes: one ring around the "K", evenly spaced, skipping nothing.
  const holeCount = 12;
  const ring = 196 * k;
  const holeR = 9 * k;
  const holeDots = holes
    ? Array.from({ length: holeCount }, (_, i) => {
        const a = (i / holeCount) * Math.PI * 2 + Math.PI / holeCount;
        const x = (cx + Math.cos(a) * ring).toFixed(1);
        const y = (cy + Math.sin(a) * ring).toFixed(1);
        return `<circle cx="${x}" cy="${y}" r="${holeR.toFixed(1)}" fill="${c.goldDark}" opacity="0.75"/><circle cx="${x}" cy="${(Number(y) - holeR * 0.35).toFixed(1)}" r="${(holeR * 0.55).toFixed(1)}" fill="${c.rust}" opacity="0.55"/>`;
      }).join("")
    : "";

  // Rounded "K": stem + two arms, round caps and joins.
  const s = (v: number) => (256 + (v - 256) * k).toFixed(1);
  const stroke = (54 * k).toFixed(1);
  const kPath = `M${s(204)} ${s(150)} V${s(362)} M${s(318)} ${s(150)} L${s(214)} ${s(258)} M${s(240)} ${s(234)} L${s(322)} ${s(362)}`;

  const bg =
    background === "none"
      ? ""
      : `<rect width="512" height="512" fill="${background === "cream" ? c.cream : c.navy}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
<defs>
<radialGradient id="crust" cx="42%" cy="38%" r="70%">
<stop offset="0" stop-color="${c.goldLight}"/>
<stop offset="0.62" stop-color="${c.gold}"/>
<stop offset="1" stop-color="${c.goldDark}"/>
</radialGradient>
</defs>
${bg}
<circle cx="${cx}" cy="${cy + 6 * k}" r="${r}" fill="${c.rust}" opacity="0.35"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#crust)"/>
<circle cx="${cx}" cy="${cy}" r="${(r - 14 * k).toFixed(1)}" fill="none" stroke="${c.goldDark}" stroke-width="${(5 * k).toFixed(1)}" opacity="0.45"/>
${holeDots}
<path d="${kPath}" fill="none" stroke="${c.navy}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}
