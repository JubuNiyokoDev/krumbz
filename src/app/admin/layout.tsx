import type { Metadata } from "next";

/**
 * Super-admin (admin.rundinova.com → /admin/…, see src/proxy.ts). French only.
 * Reserved for the super-admin work: placeholder root layout.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
