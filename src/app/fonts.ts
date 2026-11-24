import {
  Archivo_Black,
  Bebas_Neue,
  Bricolage_Grotesque,
  Cormorant_Garamond,
  DM_Sans,
  DM_Serif_Display,
  Fraunces,
  Fredoka,
  Inter,
  Lato,
  Lora,
  Manrope,
  Montserrat,
  Noto_Sans,
  Nunito,
  Open_Sans,
  Outfit,
  Playfair_Display,
  Poppins,
  Roboto,
  Source_Sans_3,
  Space_Grotesk,
  Syne,
  Work_Sans,
} from "next/font/google";

/** Headings: rounded, bold and warm. */
export const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

/** Body text: rounded humanist sans. */
export const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

/*
 * Curated families a shop may choose (src/lib/admin/theme.ts DISPLAY_FONTS / BODY_FONTS).
 * Self-hosted by next/font (no request to Google at runtime), not preloaded: the browser only
 * downloads the files of the families a shop actually uses; size-adjusted fallbacks avoid layout shift.
 */
const common = { subsets: ["latin"] as ("latin")[], display: "swap" as const, preload: false };
const fraunces = Fraunces({ ...common, variable: "--font-c-fraunces" });
const playfair = Playfair_Display({ ...common, variable: "--font-c-playfair" });
const dmSerif = DM_Serif_Display({ ...common, weight: "400", variable: "--font-c-dmserif" });
const bricolage = Bricolage_Grotesque({ ...common, variable: "--font-c-bricolage" });
const spaceGrotesk = Space_Grotesk({ ...common, variable: "--font-c-spacegrotesk" });
const syne = Syne({ ...common, variable: "--font-c-syne" });
const outfit = Outfit({ ...common, variable: "--font-c-outfit" });
const poppins = Poppins({ ...common, weight: ["400", "500", "600", "700"], variable: "--font-c-poppins" });
const montserrat = Montserrat({ ...common, variable: "--font-c-montserrat" });
const bebas = Bebas_Neue({ ...common, weight: "400", variable: "--font-c-bebas" });
const archivoBlack = Archivo_Black({ ...common, weight: "400", variable: "--font-c-archivoblack" });
const lora = Lora({ ...common, variable: "--font-c-lora" });
const cormorant = Cormorant_Garamond({ ...common, weight: ["500", "600", "700"], variable: "--font-c-cormorant" });
const inter = Inter({ ...common, variable: "--font-c-inter" });
const dmSans = DM_Sans({ ...common, variable: "--font-c-dmsans" });
const manrope = Manrope({ ...common, variable: "--font-c-manrope" });
const workSans = Work_Sans({ ...common, variable: "--font-c-worksans" });
const sourceSans = Source_Sans_3({ ...common, variable: "--font-c-sourcesans" });
const lato = Lato({ ...common, weight: ["400", "700", "900"], variable: "--font-c-lato" });
const openSans = Open_Sans({ ...common, variable: "--font-c-opensans" });
const roboto = Roboto({ ...common, weight: ["400", "500", "700"], variable: "--font-c-roboto" });
const notoSans = Noto_Sans({ ...common, variable: "--font-c-notosans" });

type LoadedFont = { variable: string };

/** Family name (as stored in TenantTheme.fonts) → next/font object and its CSS variable. */
export const SHOP_FONTS: Record<string, { font: LoadedFont; cssVar: string }> = {
  Fredoka: { font: fredoka, cssVar: "--font-fredoka" },
  Nunito: { font: nunito, cssVar: "--font-nunito" },
  Fraunces: { font: fraunces, cssVar: "--font-c-fraunces" },
  "Playfair Display": { font: playfair, cssVar: "--font-c-playfair" },
  "DM Serif Display": { font: dmSerif, cssVar: "--font-c-dmserif" },
  "Bricolage Grotesque": { font: bricolage, cssVar: "--font-c-bricolage" },
  "Space Grotesk": { font: spaceGrotesk, cssVar: "--font-c-spacegrotesk" },
  Syne: { font: syne, cssVar: "--font-c-syne" },
  Outfit: { font: outfit, cssVar: "--font-c-outfit" },
  Poppins: { font: poppins, cssVar: "--font-c-poppins" },
  Montserrat: { font: montserrat, cssVar: "--font-c-montserrat" },
  "Bebas Neue": { font: bebas, cssVar: "--font-c-bebas" },
  "Archivo Black": { font: archivoBlack, cssVar: "--font-c-archivoblack" },
  Lora: { font: lora, cssVar: "--font-c-lora" },
  "Cormorant Garamond": { font: cormorant, cssVar: "--font-c-cormorant" },
  Inter: { font: inter, cssVar: "--font-c-inter" },
  "DM Sans": { font: dmSans, cssVar: "--font-c-dmsans" },
  Manrope: { font: manrope, cssVar: "--font-c-manrope" },
  "Work Sans": { font: workSans, cssVar: "--font-c-worksans" },
  "Source Sans 3": { font: sourceSans, cssVar: "--font-c-sourcesans" },
  Lato: { font: lato, cssVar: "--font-c-lato" },
  "Open Sans": { font: openSans, cssVar: "--font-c-opensans" },
  Roboto: { font: roboto, cssVar: "--font-c-roboto" },
  "Noto Sans": { font: notoSans, cssVar: "--font-c-notosans" },
};

/**
 * Classes and CSS variables of a shop's fonts. Default (Fredoka + Nunito): exactly the Krumbz setup.
 * Other families override --font-display / --font-sans (Tailwind theme variables) on <html>.
 */
export function shopFonts(display: string, body: string): { className: string; style: Record<string, string> } {
  const d = SHOP_FONTS[display] ?? SHOP_FONTS.Fredoka;
  const b = SHOP_FONTS[body] ?? SHOP_FONTS.Nunito;
  const classes = new Set([fredoka.variable, nunito.variable, d.font.variable, b.font.variable]);
  const style: Record<string, string> = {};
  if (d !== SHOP_FONTS.Fredoka) style["--font-display"] = `var(${d.cssVar}), ui-sans-serif, system-ui, sans-serif`;
  if (b !== SHOP_FONTS.Nunito) style["--font-sans"] = `var(${b.cssVar}), ui-sans-serif, system-ui, sans-serif`;
  return { className: [...classes].join(" "), style };
}
