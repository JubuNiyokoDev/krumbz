import { Inter, Syne } from "next/font/google";

/** Display: wide, confident grotesk — the studio's signature (distinct from Krumbz' rounded Fredoka). */
export const syne = Syne({
  // Variable font: one file covers every weight used (700–800).
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

/** Body: neutral, very legible on small phone screens. */
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
