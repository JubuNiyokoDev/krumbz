import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "./session";

/**
 * Page/action guards. Public URLs (the proxy rewrites them internally):
 *   admin.<root>/connexion, admin.<root>/mot-de-passe
 *   espace.<root>/connexion (fr), espace.<root>/rn/connexion (Kirundi), …/mot-de-passe
 */

export type SuperadminSession = SessionUser & { role: "superadmin"; tenantId: null };
export type VendorSession = SessionUser & { role: "vendor"; tenantId: string };

export function espacePath(locale: string, path: string): string {
  const clean = path === "/" ? "" : path;
  return locale === "fr" ? clean || "/" : `/${locale}${clean}`;
}

export async function requireSuperadmin(options: { allowMustChange?: boolean } = {}): Promise<SuperadminSession> {
  const session = await getSession();
  if (!session || session.role !== "superadmin") redirect("/connexion");
  if (session.mustChangePassword && !options.allowMustChange) redirect("/mot-de-passe");
  return session as SuperadminSession;
}

export async function requireVendor(locale: string, options: { allowMustChange?: boolean } = {}): Promise<VendorSession> {
  const session = await getSession();
  if (!session || session.role !== "vendor" || !session.tenantId) redirect(espacePath(locale, "/connexion"));
  if (session.mustChangePassword && !options.allowMustChange) redirect(espacePath(locale, "/mot-de-passe"));
  return session as VendorSession;
}

/** Minimum password policy shared by both areas. */
export function passwordProblem(password: string): "too_short" | "too_long" | null {
  if (password.length < 10) return "too_short";
  if (password.length > 200) return "too_long";
  return null;
}
