/**
 * Host → what the platform serves (pure, no I/O; used by src/proxy.ts).
 *
 *   <slug>.ROOT                     → storefront of the tenant <slug>
 *   isoko.ROOT                      → Rundinova Studio marketing site
 *   admin.ROOT                      → super-admin
 *   espace.ROOT                     → vendor space
 *   staging-<any of the above>.ROOT → same, pre-production (staging: true)
 *   ROOT, www.ROOT                  → NOT ours (company site): "none"
 *   reserved / malformed sub-domain, foreign host → "none"
 *
 * Local development (any NODE_ENV): `<x>.localhost` follows the same rules as
 * `<x>.ROOT`; bare `localhost` / 127.0.0.1 is the marketing site unless a dev
 * tenant is given (`?tenant=<slug>`, remembered in a cookie by the proxy).
 */
import { RESERVED_SLUGS, SLUG_PATTERN } from "./types.ts";

export type HostTarget =
  | { kind: "tenant"; slug: string; staging: boolean }
  | { kind: "marketing" | "admin" | "espace"; staging: boolean }
  | { kind: "none" };

export const PLATFORM_SUBDOMAINS = { isoko: "marketing", admin: "admin", espace: "espace" } as const;
export const DEV_TENANT_PARAM = "tenant";
export const DEV_TENANT_COOKIE = "rs-dev-tenant";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);

export function rootDomain(): string {
  return (process.env.PLATFORM_ROOT_DOMAIN ?? "rundinova.com").toLowerCase();
}

export function normalizeHost(raw: string | null | undefined): string {
  if (!raw) return "";
  const first = raw.split(",")[0].trim().toLowerCase();
  // Strip the port (keep IPv6 brackets) and a trailing dot.
  const host = first.startsWith("[") ? first.slice(0, first.indexOf("]") + 1) : first.split(":")[0];
  return host.replace(/\.$/, "");
}

export function isLocalHost(host: string): boolean {
  return LOCAL_HOSTS.has(host) || host.endsWith(".localhost");
}

export function isValidTenantSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !(RESERVED_SLUGS as readonly string[]).includes(slug) && !slug.startsWith("staging-");
}

function resolveLabel(label: string): HostTarget {
  let sub = label;
  let staging = false;
  if (sub.startsWith("staging-")) {
    staging = true;
    sub = sub.slice("staging-".length);
  }
  if (sub in PLATFORM_SUBDOMAINS) return { kind: PLATFORM_SUBDOMAINS[sub as keyof typeof PLATFORM_SUBDOMAINS], staging };
  if (!isValidTenantSlug(sub)) return { kind: "none" };
  return { kind: "tenant", slug: sub, staging };
}

export function resolveHost(rawHost: string | null | undefined, options: { devTenant?: string | null; root?: string } = {}): HostTarget {
  const host = normalizeHost(rawHost);
  const root = options.root ?? rootDomain();
  if (!host || host === root || host === `www.${root}`) return { kind: "none" };

  if (LOCAL_HOSTS.has(host)) {
    const dev = options.devTenant?.toLowerCase();
    return dev && isValidTenantSlug(dev) ? { kind: "tenant", slug: dev, staging: false } : { kind: "marketing", staging: false };
  }

  const suffix = host.endsWith(".localhost") ? ".localhost" : host.endsWith(`.${root}`) ? `.${root}` : null;
  if (!suffix) return { kind: "none" };
  const label = host.slice(0, -suffix.length);
  // One level of sub-domain only (wildcard certificate *.ROOT).
  if (!label || label.includes(".")) return { kind: "none" };
  return resolveLabel(label);
}

/** Public origin of a tenant storefront, e.g. https://krumbz.rundinova.com (staging: https://staging-krumbz.rundinova.com). */
export function tenantOrigin(slug: string, options: { staging?: boolean } = {}): string {
  return `https://${options.staging ? "staging-" : ""}${slug}.${rootDomain()}`;
}
