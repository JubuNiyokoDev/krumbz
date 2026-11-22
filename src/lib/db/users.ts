/**
 * Password hashing (scrypt, node:crypto) and the super-admin password reset.
 * The login / session UI lives elsewhere; this module only owns the data rules.
 */
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import type { Db } from "./client.ts";
import { sessions, users } from "./schema.ts";

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, keylen: number, options: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;
const PARAMS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEYLEN = 64;

/** `scrypt$N$r$p$<salt b64>$<hash b64>` */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, KEYLEN, PARAMS);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: PARAMS.maxmem,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Readable temporary password (no ambiguous characters), e.g. "kq7m-xw3p-hd9t". */
export function generateTemporaryPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)].map((group) => group.join("")).join("-");
}

/**
 * Super-admin reset: sets a temporary password, forces a change at next login
 * (users.must_change_password) and revokes every open session of the user.
 * Returns the temporary password, to hand over to the vendor once.
 */
export async function resetPasswordWithTemporary(db: Db, userId: string): Promise<string | null> {
  const temporary = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporary);
  const updated = await db.transaction(async (tx) => {
    const rows = await tx.update(users).set({ passwordHash, mustChangePassword: true }).where(eq(users.id, userId)).returning({ id: users.id });
    if (rows.length) await tx.delete(sessions).where(eq(sessions.userId, userId));
    return rows.length > 0;
  });
  return updated ? temporary : null;
}

/** The user chose a new password: store it and clear the forced-change flag. */
export async function changePassword(db: Db, userId: string, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash, mustChangePassword: false }).where(eq(users.id, userId));
}
