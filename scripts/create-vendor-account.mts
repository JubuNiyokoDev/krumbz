/**
 * Adds a vendor account to an EXISTING shop (e.g. Krumbz, which was seeded without one).
 *
 *   npm run vendor:account -- <slug> <identifiant> ["<Nom du vendeur>"]
 *
 * The identifier is an e-mail or a phone number with country code. The temporary password is
 * printed ONCE and must be changed at first login. Never modifies an existing account.
 */
import { and, eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/lib/db/client.ts";
import { tenants, users } from "../src/lib/db/schema.ts";
import { generateTemporaryPassword, hashPassword } from "../src/lib/db/users.ts";
import { canonicalIdentifier } from "../src/lib/espace/validation.ts";

const [slug, rawIdentifier, name = "Vendeur"] = process.argv.slice(2);
if (!slug || !rawIdentifier) {
  console.error('Usage : npm run vendor:account -- <slug> <identifiant> ["<Nom du vendeur>"]');
  process.exit(1);
}

const db = getDb();
try {
  const identifier = canonicalIdentifier(rawIdentifier);
  if (!identifier) throw new Error("Identifiant invalide : e-mail ou numéro avec indicatif.");
  const [tenant] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug)).limit(1);
  if (!tenant) throw new Error(`Boutique introuvable : ${slug}`);
  const [existing] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, identifier))).limit(1);
  if (existing) throw new Error(`L'identifiant ${identifier} existe déjà : rien n'est modifié.`);
  const password = generateTemporaryPassword();
  await db.insert(users).values({
    email: identifier,
    passwordHash: await hashPassword(password),
    role: "vendor",
    tenantId: tenant.id,
    name,
    mustChangePassword: true,
  });
  console.log(`[vendeur] compte créé pour ${slug} : ${identifier}`);
  console.log(`[vendeur] mot de passe provisoire (à changer à la première connexion) : ${password}`);
} catch (error) {
  console.error(`[vendeur] ${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  await closeDb();
}
