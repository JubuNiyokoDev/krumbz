import type { Metadata, Viewport } from "next";
import "./admin.css";

/**
 * Super-admin (admin.rundinova.com → /admin/…, see src/proxy.ts). French only.
 * Every page calls requireSuperadmin() (through currentAdmin()) and every Server Action re-checks it.
 */
export const metadata: Metadata = {
  title: { default: "Super-administration — Rundinova Studio", template: "%s — Rundinova Studio" },
  robots: { index: false, follow: false },
  icons: { icon: [{ url: "/brand/rn-icon-32.png", sizes: "32x32", type: "image/png" }], apple: [{ url: "/brand/rn-icon-180.png", sizes: "180x180", type: "image/png" }] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
