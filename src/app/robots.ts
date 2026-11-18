import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";

/**
 * /robots.txt — the whole site is public. Next.js internals stay crawlable
 * (Google needs the JS/CSS to render the pages).
 * Preview deployments are kept out of the index: Vercel sets VERCEL_ENV.
 */
export default function robots(): MetadataRoute.Robots {
  const isPreview = process.env.VERCEL_ENV === "preview";
  return {
    rules: isPreview ? { userAgent: "*", disallow: "/" } : { userAgent: "*", allow: "/" },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
