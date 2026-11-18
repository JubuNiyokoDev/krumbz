import { ImageResponse } from "next/og";
import fr from "../../../content/site.fr.json";
import { BRAND_COLORS, brandMarkSvg } from "@/components/seo/brandMark";

/**
 * Branded 1200×630 share card, served at /og-fallback.png.
 * Used by Open Graph / Twitter metadata until the brand provides
 * public/images/og/og-image.jpg (see src/lib/seo/og.ts → ogImageUrl()).
 * The folder name contains a dot so the next-intl proxy (src/proxy.ts) skips it.
 * Prerendered at build time.
 */
export const dynamic = "force-static";

const SIZE = { width: 1200, height: 630 };
const mark = `data:image/svg+xml;base64,${Buffer.from(brandMarkSvg({ size: 420 })).toString("base64")}`;

export function GET() {
  const c = BRAND_COLORS;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 90px",
          background: `linear-gradient(135deg, ${c.cream} 0%, ${c.cream} 55%, #f8e3bf 100%)`,
          color: c.navy,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: c.rust, letterSpacing: 2, textTransform: "uppercase" }}>
            {fr.brand.company}
          </div>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 800, lineHeight: 1, marginTop: 18, letterSpacing: -4 }}>
            {fr.brand.name}
          </div>
          <div style={{ display: "flex", fontSize: 58, fontWeight: 700, color: c.gold, marginTop: 12 }}>
            {fr.brand.tagline}
          </div>
          <div style={{ display: "flex", fontSize: 30, marginTop: 34, lineHeight: 1.35, color: c.navy }}>
            {`${fr.brand.base} · ${fr.brand.origin}`}
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser */}
        <img src={mark} width={420} height={420} alt="" />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 18,
            display: "flex",
            background: `linear-gradient(90deg, ${c.gold}, ${c.rust})`,
          }}
        />
      </div>
    ),
    SIZE,
  );
}
