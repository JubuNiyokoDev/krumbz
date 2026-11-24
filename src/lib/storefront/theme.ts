/**
 * Storefront palette of a tenant → the Tailwind colour tokens of src/app/globals.css (--color-cream …),
 * set as CSS variables on the storefront <html>. Pure (shared by the storefront, the admin preview and the seeds).
 *
 * Roles (same as Krumbz): cream = page background, creamDeep = alternate band, gold* = accent (badges,
 * highlights, door transition), rust* = warm secondary (eyebrows, links, focus), navy* = dark brand colour
 * (text, buttons, dark sections), ink = deepest text, whatsapp = WhatsApp buttons.
 */
import { PALETTE_KEYS, type PaletteKey, type TenantPalette, type TenantTheme } from "../tenant/types.ts";

/** Krumbz tokens, exactly the values of src/app/globals.css (@theme). */
export const KRUMBZ_PALETTE: TenantPalette = {
  cream: "#fff6e8",
  creamDeep: "#f6e6c8",
  gold: "#e2a23a",
  goldLight: "#f3c76b",
  goldDark: "#b97a1c",
  rust: "#a4501a",
  rustBright: "#d2691e",
  navy: "#12264a",
  navySoft: "#1e3a66",
  ink: "#1b1b1f",
  whatsapp: "#128c4a",
};

/** CSS variable of each token (Tailwind v4 theme variables). */
export const PALETTE_VARS: Record<PaletteKey, string> = {
  cream: "--color-cream",
  creamDeep: "--color-cream-deep",
  gold: "--color-gold",
  goldLight: "--color-gold-light",
  goldDark: "--color-gold-dark",
  rust: "--color-rust",
  rustBright: "--color-rust-bright",
  navy: "--color-navy",
  navySoft: "--color-navy-soft",
  ink: "--color-ink",
  whatsapp: "--color-whatsapp",
};

const HEX = /^#[0-9a-f]{6}$/i;
const isHex = (value: unknown): value is string => typeof value === "string" && HEX.test(value);

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function toHex([r, g, b]: number[]): string {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;
}

/** Linear mix of two #rrggbb colours (amount of `b`: 0 → a, 1 → b). */
export function mix(a: string, b: string, amount: number): string {
  const [ca, cb] = [rgb(a), rgb(b)];
  return toHex(ca.map((c, i) => c + (cb[i] - c) * amount));
}

/** Complete palette: explicit tokens first, the others derived from the base colours. */
export function resolvePalette(theme: Pick<TenantTheme, "colors" | "palette">): TenantPalette {
  const { colors } = theme;
  const explicit = theme.palette ?? {};
  const pick = (key: PaletteKey, derived: () => string) => (isHex(explicit[key]) ? (explicit[key] as string) : derived());

  const cream = pick("cream", () => (isHex(colors.background) ? colors.background : KRUMBZ_PALETTE.cream));
  const gold = pick("gold", () => (isHex(colors.accent) ? colors.accent : KRUMBZ_PALETTE.gold));
  const navy = pick("navy", () => (isHex(colors.primary) ? colors.primary : KRUMBZ_PALETTE.navy));
  const rust = pick("rust", () => (isHex(colors.muted) ? mix(colors.muted, navy, 0.15) : mix(gold, "#000000", 0.38)));
  return {
    cream,
    creamDeep: pick("creamDeep", () => mix(cream, gold, 0.2)),
    gold,
    goldLight: pick("goldLight", () => mix(gold, "#ffffff", 0.35)),
    goldDark: pick("goldDark", () => mix(gold, "#000000", 0.22)),
    rust,
    rustBright: pick("rustBright", () => mix(rust, gold, 0.45)),
    navy,
    navySoft: pick("navySoft", () => mix(navy, "#ffffff", 0.12)),
    ink: pick("ink", () => (isHex(colors.text) ? mix(colors.text, "#000000", 0.2) : KRUMBZ_PALETTE.ink)),
    whatsapp: pick("whatsapp", () => KRUMBZ_PALETTE.whatsapp),
  };
}

/** `style` of the storefront <html>: every colour token as a CSS variable (+ rgb triplets for shadows). */
export function paletteStyle(palette: TenantPalette): Record<string, string> {
  const style: Record<string, string> = {};
  for (const key of PALETTE_KEYS) {
    style[PALETTE_VARS[key]] = palette[key];
    style[`${PALETTE_VARS[key]}-rgb`] = rgb(palette[key]).join(" ");
  }
  return style;
}
