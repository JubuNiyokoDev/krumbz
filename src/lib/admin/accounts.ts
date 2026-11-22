/**
 * Vendor accounts managed by the super-admin: creation with a temporary password,
 * (de)activation, password reset, and the prefilled WhatsApp message carrying the credentials.
 * The temporary password is returned once to the caller: never stored in clear, never logged.
 */
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { sessions, tenants, users } from "../db/schema.ts";
import { generateTemporaryPassword, hashPassword, resetPasswordWithTemporary } from "../db/users.ts";
import { rootDomain } from "../tenant/hosts.ts";
import { audit, type DbOrTx } from "./audit.ts";

export class AccountError extends Error {
  code: "identifier_taken" | "not_found";
  constructor(code: "identifier_taken" | "not_found") {
    super(code);
    this.code = code;
  }
}

/** Public URL of the vendor space login (espace.<root>/connexion, French). */
export function vendorLoginUrl(): string {
  return `https://espace.${rootDomain()}/connexion`;
}

export function credentialsMessage(input: { shopName: string; identifier: string; password: string; loginUrl?: string }): string {
  return [
    `Bonjour, voici vos accès à l'espace vendeur Rundinova Studio (${input.shopName}) :`,
    `Adresse : ${input.loginUrl ?? vendorLoginUrl()}`,
    `Identifiant : ${input.identifier}`,
    `Mot de passe provisoire : ${input.password}`,
    "Vous choisirez votre propre mot de passe à la première connexion.",
  ].join("\n");
}

/** https://wa.me/<digits>?text=<message> (number: digits with country code). */
export function whatsappLink(number: string, text: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export async function identifierTaken(db: DbOrTx, identifier: string): Promise<boolean> {
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, identifier)).limit(1);
  return Boolean(row);
}

/** Inserts a vendor user with a fresh temporary password (must be changed at first login). */
export async function insertVendorUser(
  db: DbOrTx,
  input: { tenantId: string; identifier: string; name: string },
): Promise<{ userId: string; temporaryPassword: string }> {
  if (await identifierTaken(db, input.identifier)) throw new AccountError("identifier_taken");
  const temporaryPassword = generateTemporaryPassword();
  const [row] = await db
    .insert(users)
    .values({
      email: input.identifier,
      passwordHash: await hashPassword(temporaryPassword),
      role: "vendor",
      tenantId: input.tenantId,
      name: input.name,
      mustChangePassword: true,
    })
    .returning({ id: users.id });
  return { userId: row.id, temporaryPassword };
}

export async function createVendorAccount(
  db: Db,
  input: { tenantId: string; identifier: string; name: string },
  actorUserId: string | null,
): Promise<{ userId: string; temporaryPassword: string }> {
  return db.transaction(async (tx) => {
    const created = await insertVendorUser(tx, input);
    await audit(tx, {
      actorUserId,
      tenantId: input.tenantId,
      action: "account.create",
      entity: "user",
      entityId: created.userId,
      data: { identifier: input.identifier },
    });
    return created;
  });
}

async function vendorUser(db: DbOrTx, userId: string) {
  const [row] = await db
    .select({ id: users.id, identifier: users.email, tenantId: users.tenantId, shopName: tenants.name, whatsapp: tenants.contact })
    .from(users)
    .innerJoin(tenants, eq(tenants.id, users.tenantId))
    .where(and(eq(users.id, userId), eq(users.role, "vendor")))
    .limit(1);
  if (!row || !row.tenantId) throw new AccountError("not_found");
  return { ...row, tenantId: row.tenantId, whatsapp: row.whatsapp.whatsapp };
}

/**
 * Super-admin reset: temporary password, forced change at next login, every session revoked
 * (resetPasswordWithTemporary). Returns what the WhatsApp message needs.
 */
export async function resetVendorPassword(db: Db, userId: string, actorUserId: string | null) {
  const user = await vendorUser(db, userId);
  const temporaryPassword = await resetPasswordWithTemporary(db, userId);
  if (!temporaryPassword) throw new AccountError("not_found");
  await audit(db, { actorUserId, tenantId: user.tenantId, action: "account.reset_password", entity: "user", entityId: userId, data: { identifier: user.identifier } });
  const message = credentialsMessage({ shopName: user.shopName, identifier: user.identifier, password: temporaryPassword });
  return { identifier: user.identifier, temporaryPassword, tenantId: user.tenantId, whatsappUrl: whatsappLink(user.whatsapp, message) };
}

/** Deactivating also closes every open session of the account. */
export async function setVendorAccountActive(db: Db, userId: string, active: boolean, actorUserId: string | null): Promise<{ tenantId: string }> {
  const user = await vendorUser(db, userId);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ active }).where(eq(users.id, userId));
    if (!active) await tx.delete(sessions).where(eq(sessions.userId, userId));
    await audit(tx, { actorUserId, tenantId: user.tenantId, action: "account.active", entity: "user", entityId: userId, data: { active } });
  });
  return { tenantId: user.tenantId };
}
