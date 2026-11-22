import type { Metadata } from "next";

/** Root layout of the « Boutique en pause » page (src/proxy.ts rewrites every path of a paused shop here). */
export const metadata: Metadata = { robots: { index: false } };

export default async function PausedLayout({ children, params }: LayoutProps<"/paused/[tenant]/[locale]">) {
  const { locale } = await params;
  return (
    <html lang={locale}>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
