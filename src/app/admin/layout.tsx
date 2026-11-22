import type { Metadata, Viewport } from "next";
import "./admin.css";

/**
 * Super-admin (admin.rundinova.com → /admin/…, see src/proxy.ts). French only.
 * Every page calls requireSuperadmin() (through currentAdmin()) and every Server Action re-checks it.
 */
export const metadata: Metadata = {
  title: { default: "Super-administration — Rundinova Studio", template: "%s — Rundinova Studio" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
