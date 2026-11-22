import type { CSSProperties } from "react";
import type { TenantTheme } from "@/lib/tenant/types";

const RADIUS: Record<TenantTheme["radius"], { card: string; control: string; image: string }> = {
  soft: { card: "1.1rem", control: "0.8rem", image: "0.9rem" },
  round: { card: "2rem", control: "999px", image: "1.6rem" },
  sharp: { card: "0.2rem", control: "0.15rem", image: "0.1rem" },
};

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, "");
  const full = clean.length === 3 ? clean.replace(/./g, (c) => c + c) : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Readable text colour (dark or light) on top of `hex`. */
export function onColor(hex: string, dark = "#111111", light = "#ffffff"): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return light;
  const l = luminance(rgb);
  // Contrast against white vs black; pick the stronger.
  return (1.05 / (l + 0.05) >= (l + 0.05) / 0.05 ? light : dark);
}

export function isDark(hex: string): boolean {
  const rgb = hexToRgb(hex);
  return rgb ? luminance(rgb) < 0.2 : false;
}

const FALLBACK_DISPLAY = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const FALLBACK_BODY = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const family = (name: string) => `"${name.replace(/["\\]/g, "")}"`;

/** CSS custom properties of a tenant theme, applied on the template root. */
export function themeStyle(theme: TenantTheme): CSSProperties {
  const { colors, fonts, radius } = theme;
  const r = RADIUS[radius] ?? RADIUS.soft;
  return {
    "--vt-bg": colors.background,
    "--vt-surface": colors.surface,
    "--vt-primary": colors.primary,
    "--vt-on-primary": onColor(colors.primary, colors.text, "#ffffff"),
    "--vt-accent": colors.accent,
    "--vt-on-accent": onColor(colors.accent, "#111111", "#ffffff"),
    "--vt-text": colors.text,
    "--vt-muted": colors.muted,
    "--vt-font-display": `${family(fonts.display)}, ${FALLBACK_DISPLAY}`,
    "--vt-font-body": `${family(fonts.body)}, ${FALLBACK_BODY}`,
    "--vt-radius-card": r.card,
    "--vt-radius-control": r.control,
    "--vt-radius-image": r.image,
    colorScheme: isDark(colors.background) ? "dark" : "light",
  } as CSSProperties;
}

/**
 * Weights known to exist for common Google Fonts families. Requesting a weight
 * a family does not have makes Google Fonts answer 400 (stylesheet error), so
 * unknown families are requested without an axis (regular only; bold is
 * synthesized by the browser). Add families here when a vendor picks a new one.
 */
const KNOWN_WEIGHTS: Record<string, string> = {
  "Bricolage Grotesque": "wght@400;600;700;800",
  "DM Sans": "wght@400;500;700",
  Inter: "wght@400;500;600;700",
  "Space Grotesk": "wght@400;500;700",
  Syne: "wght@600;700;800",
  Unbounded: "wght@500;700;800",
  "Plus Jakarta Sans": "wght@400;600;700;800",
  Manrope: "wght@400;600;700;800",
  Poppins: "wght@400;600;700;800",
  Montserrat: "wght@400;600;700;800",
  Outfit: "wght@400;600;700;800",
  Fraunces: "wght@400;600;700;800",
  "Playfair Display": "wght@400;600;700;800",
  "Cormorant Garamond": "wght@400;600;700",
  "Archivo Black": "",
  "Bebas Neue": "",
  Fredoka: "wght@400;500;600;700",
  Nunito: "wght@400;600;700;800",
  Lora: "wght@400;600;700",
  "Work Sans": "wght@400;500;700",
  Sora: "wght@400;600;700;800",
};

/** Google Fonts stylesheet URL for the tenant display + body families. */
export function googleFontsHref(theme: TenantTheme): string {
  const names = [...new Set([theme.fonts.display, theme.fonts.body].map((n) => n.trim()).filter(Boolean))];
  const params = names.map((name) => {
    const axis = KNOWN_WEIGHTS[name];
    const encoded = encodeURIComponent(name).replace(/%20/g, "+");
    return `family=${encoded}${axis ? `:${axis}` : ""}`;
  });
  return `https://fonts.googleapis.com/css2?${params.join("&")}&display=swap`;
}
