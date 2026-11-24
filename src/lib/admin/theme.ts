/**
 * Vendor theme rules of the super-admin: curated Google Fonts, colour contrast (WCAG 2.x), defaults.
 * Pure: shared by Server Actions and the client editors (live warnings).
 */
import { PALETTE_KEYS, type PaletteKey, type TenantPalette, type TenantTheme } from "../tenant/types.ts";

/** Curated Google Fonts families (titles). Loaded by the storefront template, never by the admin. */
export const DISPLAY_FONTS = [
  "Fraunces",
  "Playfair Display",
  "DM Serif Display",
  "Bricolage Grotesque",
  "Space Grotesk",
  "Syne",
  "Outfit",
  "Poppins",
  "Montserrat",
  "Fredoka",
  "Bebas Neue",
  "Archivo Black",
  "Lora",
  "Cormorant Garamond",
] as const;

/** Curated Google Fonts families (body text): legible at small sizes. */
export const BODY_FONTS = ["Inter", "DM Sans", "Manrope", "Nunito", "Work Sans", "Source Sans 3", "Lato", "Open Sans", "Roboto", "Noto Sans", "Lora"] as const;

export const RADIUS_OPTIONS: { value: TenantTheme["radius"]; label: string }[] = [
  { value: "soft", label: "Doux (coins légèrement arrondis)" },
  { value: "round", label: "Rond (coins très arrondis)" },
  { value: "sharp", label: "Net (coins droits)" },
];

export const COLOR_FIELDS: { key: keyof TenantTheme["colors"]; label: string }[] = [
  { key: "background", label: "Fond" },
  { key: "surface", label: "Surface (cartes)" },
  { key: "primary", label: "Principale (boutons)" },
  { key: "accent", label: "Accent" },
  { key: "text", label: "Texte" },
  { key: "muted", label: "Texte secondaire" },
];

/** Storefront colour tokens (TenantTheme.palette); empty = derived from the base colours. */
export const PALETTE_FIELDS: { key: PaletteKey; label: string }[] = [
  { key: "cream", label: "Fond de page (cream)" },
  { key: "creamDeep", label: "Bandes alternées (cream-deep)" },
  { key: "gold", label: "Accent (gold)" },
  { key: "goldLight", label: "Accent clair (gold-light)" },
  { key: "goldDark", label: "Accent foncé (gold-dark)" },
  { key: "rust", label: "Secondaire chaud — surtitres, liens (rust)" },
  { key: "rustBright", label: "Secondaire vif — focus (rust-bright)" },
  { key: "navy", label: "Couleur sombre — texte, boutons, sections foncées (navy)" },
  { key: "navySoft", label: "Sombre adouci (navy-soft)" },
  { key: "ink", label: "Texte le plus foncé (ink)" },
  { key: "whatsapp", label: "Boutons WhatsApp" },
];

/** Default look of a new shop: the Krumbz fonts, neutral colours (palette derived). */
export const DEFAULT_THEME: TenantTheme = {
  colors: { background: "#faf7f2", surface: "#ffffff", primary: "#1f3a5f", accent: "#d9822b", text: "#1b1b1f", muted: "#5b5f6a" },
  fonts: { display: "Fredoka", body: "Nunito" },
  radius: "round",
  logoUrl: null,
};

const HEX = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Readability warnings (non blocking): AA 4.5:1 for text, 3:1 for buttons / large elements. */
export function contrastWarnings(colors: TenantTheme["colors"]): string[] {
  const checks: { a: keyof TenantTheme["colors"]; b: keyof TenantTheme["colors"]; min: number; what: string }[] = [
    { a: "text", b: "background", min: 4.5, what: "Texte sur fond" },
    { a: "text", b: "surface", min: 4.5, what: "Texte sur surface" },
    { a: "muted", b: "background", min: 4.5, what: "Texte secondaire sur fond" },
    { a: "primary", b: "background", min: 3, what: "Couleur principale sur fond" },
    { a: "background", b: "primary", min: 4.5, what: "Texte des boutons (fond sur principale)" },
  ];
  const warnings: string[] = [];
  for (const check of checks) {
    const [a, b] = [colors[check.a], colors[check.b]];
    if (!isHexColor(a) || !isHexColor(b)) continue;
    const ratio = contrastRatio(a, b);
    if (ratio < check.min) warnings.push(`${check.what} : contraste ${ratio.toFixed(1)}:1 (minimum conseillé ${check.min}:1).`);
  }
  return warnings;
}

export type ThemeInput = {
  colors: Record<string, string>;
  /** Optional storefront tokens: empty string = derived. */
  palette?: Record<string, string>;
  display: string;
  body: string;
  radius: string;
};

/** Validates the optional palette tokens: hex or empty (derived). */
export function validatePalette(input: Record<string, string> | undefined): { palette: Partial<TenantPalette>; errors: string[] } {
  const palette: Partial<TenantPalette> = {};
  const errors: string[] = [];
  for (const key of PALETTE_KEYS) {
    const value = (input?.[key] ?? "").trim().toLowerCase();
    if (!value) continue;
    if (!isHexColor(value)) {
      const label = PALETTE_FIELDS.find((f) => f.key === key)?.label ?? key;
      errors.push(`Couleur « ${label} » invalide (format #rrggbb, ou vide pour la valeur calculée).`);
      continue;
    }
    palette[key] = value;
  }
  return { palette, errors };
}

/** Validates the editable part of a theme (the logo and the icon are handled separately). */
export function validateTheme(
  input: ThemeInput,
  logoUrl: string | null,
  iconUrl: string | null = null,
): { theme: TenantTheme; errors: string[] } {
  const errors: string[] = [];
  const colors = {} as TenantTheme["colors"];
  for (const { key, label } of COLOR_FIELDS) {
    const value = (input.colors[key] ?? "").trim().toLowerCase();
    if (!isHexColor(value)) errors.push(`Couleur « ${label} » invalide (format #rrggbb).`);
    colors[key] = isHexColor(value) ? value : DEFAULT_THEME.colors[key];
  }
  const palette = validatePalette(input.palette);
  errors.push(...palette.errors);
  if (!(DISPLAY_FONTS as readonly string[]).includes(input.display)) errors.push("Police des titres inconnue.");
  if (!(BODY_FONTS as readonly string[]).includes(input.body)) errors.push("Police du texte inconnue.");
  const radius = RADIUS_OPTIONS.some((o) => o.value === input.radius) ? (input.radius as TenantTheme["radius"]) : null;
  if (!radius) errors.push("Arrondi inconnu.");
  return {
    theme: {
      colors,
      ...(Object.keys(palette.palette).length ? { palette: palette.palette } : {}),
      fonts: { display: input.display, body: input.body },
      radius: radius ?? "soft",
      logoUrl,
      ...(iconUrl ? { iconUrl } : {}),
    },
    errors,
  };
}
