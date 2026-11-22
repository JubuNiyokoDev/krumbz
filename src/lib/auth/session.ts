import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, gte, lt, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { getDb } from "@/lib/db/client";
import { loginAttempts, sessions, users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/db/users";
import { isLocalHost, normalizeHost } from "@/lib/tenant/hosts";
import { requestHostHeader } from "@/lib/tenant/request-host";

/**
 * Sessions of the vendor space and the super-admin (docs/plan.md §2).
 *
 * - The raw token (32 random bytes) only lives in an HttpOnly cookie; the database stores its SHA-256.
 * - Cookies are host-only (admin.<root> and espace.<root> never share a session), Secure outside
 *   localhost, SameSite=Lax. Server Actions are additionally protected by Next's Origin check.
 * - Login is rate limited per identifier and per (hashed) client address; no raw IP is stored.
 */

export const SESSION_COOKIE = "rs_session";
const SESSION_DAYS = 30;
const RENEW_AFTER_MS = 60 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_IDENTIFIER = 5;
const MAX_FAILURES_PER_ADDRESS = 20;

export type Role = "superadmin" | "vendor";

export interface SessionUser {
  sessionId: string;
  userId: string;
  role: Role;
  tenantId: string | null;
  name: string;
  email: string;
  locale: string;
  mustChangePassword: boolean;
}

export type LoginResult =
  | { ok: true; user: SessionUser }
  | { ok: false; reason: "invalid" | "rate_limited" | "wrong_area" | "inactive" };

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Login identifier: e-mail or phone, stored lower-cased without spaces. */
export function normalizeIdentifier(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}

async function clientAddressKey(): Promise<string | null> {
  const h = await headers();
  const forwarded = process.env.TRUST_FORWARDED_HOST === "1" ? (h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]) : null;
  const address = forwarded?.trim();
  if (!address) return null;
  return `ip:${sha256(`${process.env.SESSION_SECRET ?? "rundinova-studio"}:${address}`)}`;
}

async function isSecureRequest(): Promise<boolean> {
  const h = await headers();
  return !isLocalHost(normalizeHost(requestHostHeader(h)));
}

async function recentFailures(identifier: string): Promise<number> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.identifier, identifier), eq(loginAttempts.success, false), gte(loginAttempts.createdAt, since)));
  return row?.n ?? 0;
}

// A real scrypt hash of a random string: unknown identifiers cost the same time as known ones.
let dummyHash: Promise<string> | null = null;
async function burnTime(password: string) {
  const { hashPassword } = await import("@/lib/db/users");
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(password, await dummyHash);
}

export async function login(rawIdentifier: string, password: string, area: Role): Promise<LoginResult> {
  const identifier = normalizeIdentifier(rawIdentifier);
  if (!identifier || !password) return { ok: false, reason: "invalid" };
  const db = getDb();
  const idKey = `id:${sha256(identifier)}`;
  const addressKey = await clientAddressKey();

  if ((await recentFailures(idKey)) >= MAX_FAILURES_PER_IDENTIFIER) return { ok: false, reason: "rate_limited" };
  if (addressKey && (await recentFailures(addressKey)) >= MAX_FAILURES_PER_ADDRESS) return { ok: false, reason: "rate_limited" };

  const [user] = await db.select().from(users).where(eq(users.email, identifier)).limit(1);
  const valid = user ? await verifyPassword(password, user.passwordHash) : (await burnTime(password), false);

  const record = (success: boolean) =>
    db.insert(loginAttempts).values([{ identifier: idKey, success }, ...(addressKey ? [{ identifier: addressKey, success }] : [])]);

  if (!user || !valid) {
    await record(false);
    return { ok: false, reason: "invalid" };
  }
  if (!user.active) return { ok: false, reason: "inactive" };
  if (user.role !== area) {
    await record(false);
    return { ok: false, reason: "wrong_area" };
  }
  await record(true);

  const token = randomBytes(32).toString("base64url");
  const id = sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ id, userId: user.id, tenantId: user.tenantId, expiresAt });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  // Housekeeping, cheap thanks to the indexes.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, new Date(Date.now() - 7 * 86_400_000)));

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: await isSecureRequest(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return {
    ok: true,
    user: {
      sessionId: id,
      userId: user.id,
      role: user.role,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      locale: user.locale,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

/** Current session, or null (expired, revoked, inactive user). Renews the expiry at most once an hour. */
export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const id = sha256(token);
  const db = getDb();
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row || !row.user.active) return null;
  if (Date.now() - row.session.lastSeenAt.getTime() > RENEW_AFTER_MS) {
    await db
      .update(sessions)
      .set({ lastSeenAt: new Date(), expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) })
      .where(eq(sessions.id, id));
  }
  return {
    sessionId: id,
    userId: row.user.id,
    role: row.user.role,
    tenantId: row.user.tenantId,
    name: row.user.name,
    email: row.user.email,
    locale: row.user.locale,
    mustChangePassword: row.user.mustChangePassword,
  };
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.id, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

/** Revokes every other session of the user (after a password change). */
export async function revokeOtherSessions(userId: string, keepSessionId: string): Promise<void> {
  await getDb()
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), sql`${sessions.id} <> ${keepSessionId}`));
}
