import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Cache Components is intentionally disabled: every page is statically
 * generated (generateStaticParams), and server code checks the filesystem for
 * the brand images so that a file dropped in /public is picked up on the next
 * request in dev and on the next build in production.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 640, 828, 1080, 1440, 1920],
    imageSizes: [64, 128, 256, 384],
    // Brand images keep their file name when replaced: keep the optimizer cache short.
    minimumCacheTTL: 60 * 60 * 24,
    localPatterns: [{ pathname: "/images/**", search: "" }],
  },
  experimental: {
    globalNotFound: true,
    optimizePackageImports: ["three", "@react-three/drei", "gsap"],
  },
  turbopack: {
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(basis|vendor)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // Brand assets keep their file name when replaced: revalidate daily.
        source: "/(models|textures|images)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
