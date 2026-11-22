import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { isLocalHost, normalizeHost, resolveHost } from "@/lib/tenant/hosts";
import { requestHostHeader } from "@/lib/tenant/request-host";

/**
 * /robots.txt, per host: storefronts and the marketing site are public (with
 * their /sitemap.xml); admin, vendor space, staging and foreign hosts are kept
 * out of the index. Next.js internals stay crawlable (Google renders the JS/CSS).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const host = normalizeHost(requestHostHeader(h));
  const target = resolveHost(host);
  const isPublic = (target.kind === "tenant" || target.kind === "marketing") && !target.staging && process.env.VERCEL_ENV !== "preview";
  if (!isPublic) return { rules: { userAgent: "*", disallow: "/" } };
  // Public hosts are always served over HTTPS by the VPS nginx (TLS termination): never trust the
  // internal hop's protocol, which is plain http between nginx and the app.
  const local = isLocalHost(host);
  const proto = local ? "http" : "https";
  const port = local ? (requestHostHeader(h)?.split(":")[1] ?? "") : "";
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${proto}://${host}${port ? `:${port}` : ""}/sitemap.xml`,
  };
}
