#!/usr/bin/env node
/**
 * Creates a vendor shop and its first vendor account.
 *
 *   npm run vendor:create -- <slug> "<Nom de la boutique>" <identifiant> <whatsapp> ["<Nom du vendeur>"] [jours-d-essai]
 *
 * The tenant uses the single storefront template (« boutique »), the French locale and the default
 * feature set. A 14-day trial subscription is created. The temporary password is printed
 * ONCE with a prefilled WhatsApp link and must be changed at first login.
 * Rejects an existing slug or identifier; never modifies an existing account.
 */
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/lib/db/client.ts";
import { FEATURE_KEYS } from "../src/lib/db/mappers.ts";
import { subscriptions, tenantFeatures, tenants, users } from "../src/lib/db/schema.ts";
import { generateTemporaryPassword, hashPassword } from "../src/lib/db/users.ts";
import { canonicalIdentifier, normalizePhone } from "../src/lib/espace/validation.ts";
import { isValidTenantSlug, rootDomain } from "../src/lib/tenant/hosts.ts";
import type { TenantContact, TenantTheme } from "../src/lib/tenant/types.ts";
import { starterContent } from "../src/lib/admin/content.ts";
import { starterScenes } from "../src/lib/admin/scenes.ts";
import { DEFAULT_THEME } from "../src/lib/admin/theme.ts";

const usage = 'Usage : npm run vendor:create -- <slug> "<Nom>" <identifiant> <whatsapp> ["<Nom vendeur>"] [jours]';
const [rawSlug, name, rawIdentifier, rawWhatsapp, ownerName = "Vendeur", rawDays = "14"] = process.argv.slice(2);
const slug = (rawSlug ?? "").trim().toLowerCase();
const identifier = rawIdentifier ? canonicalIdentifier(rawIdentifier) : "";
const whatsapp = rawWhatsapp ? normalizePhone(rawWhatsapp) : null;
const trialDays = Number(rawDays);
if (!slug || !isValidTenantSlug(slug) || !name?.trim() || !identifier || !whatsapp || !Number.isInteger(trialDays) || trialDays < 1 || trialDays > 365) {
  console.error(usage);
  process.exit(1);
}

const theme: TenantTheme = DEFAULT_THEME;
const contact: TenantContact = { whatsapp, phones: [], email: null, address: null, city: null, hours: null, mapUrl: null, socials: [] };
// Complete neutral starter (template schema) + the minimum number of scenes; replaced from the super-admin.
const content = starterContent(name.trim());
const scenes = starterScenes(slug);

const db = getDb();
try {
  const password = generateTemporaryPassword();
  const result = await db.transaction(async (tx) => {
    const [taken] = await tx.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (taken) throw new Error(`Le sous-domaine « ${slug} » existe déjà.`);
    const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.email, identifier)).limit(1);
    if (existing) throw new Error(`L'identifiant « ${identifier} » existe déjà.`);
    const [tenant] = await tx
      .insert(tenants)
      .values({ slug, name: name.trim(), status: "trial", template: "boutique", locales: ["fr"], theme, contact, content, scenes })
      .returning({ id: tenants.id });
    await tx.insert(tenantFeatures).values(FEATURE_KEYS.map((key) => ({ tenantId: tenant.id, key, enabled: ["threeD", "advancedAnimations", "languages", "stats"].includes(key) })));
    await tx.insert(subscriptions).values({
      tenantId: tenant.id,
      plan: "essai",
      status: "trial",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + trialDays * 86_400_000),
      priceBif: 0,
    });
    await tx.insert(users).values({
      email: identifier,
      passwordHash: await hashPassword(password),
      role: "vendor",
      tenantId: tenant.id,
      name: ownerName,
      mustChangePassword: true,
    });
    return tenant.id;
  });

  const message = [
    `Bonjour, voici vos accès à l'espace vendeur Rundinova Studio (${name.trim()}) :`,
    `Adresse : https://espace.${rootDomain()}/connexion`,
    `Identifiant : ${identifier}`,
    `Mot de passe provisoire : ${password}`,
    'Vous choisirez votre propre mot de passe à la première connexion.',
  ].join("\n");
  console.log(`[vendor] boutique créée : ${slug} (${result}) — essai de ${trialDays} jour(s).`);
  console.log(`[vendor] identifiant : ${identifier}`);
  console.log(`[vendor] mot de passe provisoire (à changer à la première connexion) : ${password}`);
  console.log(`[vendor] lien WhatsApp : https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`);
} finally {
  await closeDb();
}
