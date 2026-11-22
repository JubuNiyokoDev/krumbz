#!/usr/bin/env node
/**
 * Creates (or resets) a super-admin account.
 *
 *   npm run admin:create -- <email> ["Nom affiché"]
 *
 * The password is generated, printed ONCE, and must be changed at first login
 * (users.must_change_password). Re-running for an existing e-mail resets its password.
 */
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/lib/db/client.ts";
import { users } from "../src/lib/db/schema.ts";
import { generateTemporaryPassword, hashPassword } from "../src/lib/db/users.ts";

const [rawEmail, name = "Super-admin"] = process.argv.slice(2);
const email = rawEmail?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage : npm run admin:create -- <email> [\"Nom\"]");
  process.exit(1);
}

const db = getDb();
try {
  const password = generateTemporaryPassword();
  const passwordHash = await hashPassword(password);
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing && existing.role !== "superadmin") {
    console.error(`[admin] ${email} existe déjà comme compte vendeur : choisissez une autre adresse.`);
    process.exit(1);
  }
  if (existing) {
    await db.update(users).set({ passwordHash, mustChangePassword: true, active: true }).where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({ email, passwordHash, role: "superadmin", tenantId: null, name, mustChangePassword: true });
  }
  console.log(`[admin] ${existing ? "mot de passe réinitialisé" : "compte créé"} : ${email}`);
  console.log(`[admin] mot de passe provisoire (à changer à la première connexion) : ${password}`);
} finally {
  await closeDb();
}
