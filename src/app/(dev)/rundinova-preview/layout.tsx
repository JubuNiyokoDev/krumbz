import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { RUNDINOVA_THEME_COLOR } from "@/marketing";

/**
 * Dev-only preview of the Rundinova Studio marketing site (own root layout).
 * Never indexed. The production route belongs to the routing owner.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  themeColor: RUNDINOVA_THEME_COLOR,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function PreviewLayout({ children }: { children: ReactNode }) {
  // The page sets the real <html lang> through the `lang` search param; FR by default.
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
