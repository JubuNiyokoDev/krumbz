import { Montserrat } from "next/font/google";

/**
 * RundiNova Tech typeface: geometric sans of the wordmark (Montserrat), one variable file for every
 * weight (400–800) — titles and body, so a single font request on the critical path (LCP).
 */
export const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});
