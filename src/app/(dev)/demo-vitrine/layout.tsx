import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

/**
 * Root layout of the « vitrine » template preview (dev only, never indexed).
 * The template brings its own styles (Tailwind + vitrine.css) and fonts.
 */
export const metadata: Metadata = {
  // Preview only: the platform route sets the vendor host as metadataBase.
  metadataBase: new URL("http://localhost:3000"),
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4eee6",
};

export default function DemoVitrineLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
