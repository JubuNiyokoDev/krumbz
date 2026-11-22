/**
 * Super-admin: isolation and safety of the platform-wide mutations.
 *
 * The admin is global by design, but every mutation must target exactly one tenant:
 * a slug, a user id or a payment id from another shop can never leak or be modified.
 * Runs against a migrated database (DATABASE_URL), creates throwaway tenants and
 * removes them afterwards. Certificate requests go to a temporary directory.
 *
 *   npm run test:isolation
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import { closeDb, getDb } from "../../src/lib/db/client.ts";
import { auditLog, sessions, subscriptions, tenantFeatures, tenants, users } from "../../src/lib/db/schema.ts";
import { insertVendorUser, resetVendorPassword, setVendorAccountActive } from "../../src/lib/admin/accounts.ts";
import { starterContent } from "../../src/lib/admin/content.ts";
import { DEFAULT_THEME } from "../../src/lib/admin/theme.ts";
import { createVendor, setFeature, setTenantStatus, updateTenant, VendorError } from "../../src/lib/admin/vendors.ts";
import { isUuid, normalizeSlug, parseAmount, parseDateInput, slugProblem } from "../../src/lib/admin/validation.ts";
import { expireSubscriptions } from "../../src/lib/billing/expire.ts";
import { BillingError, declarePayment, rejectPayment, validatePayment } from "../../src/lib/billing/subscriptions.ts";
import { mergeOffer, mergeStudio } from "../../src/lib/platform/settings.ts";
import { FEATURE_KEYS } from "../../src/lib/db/mappers.ts";
import type { TenantContact, TenantFeatures } from "../../src/lib/tenant/types.ts";

const db = getDb();
const suffix = randomBytes(3).toString("hex");
const contact: TenantContact = { whatsapp: "25700000000", phones: [], email: null, address: null, city: null, hours: null, mapUrl: null, socials: [] };
const features: TenantFeatures = { threeD: true, advancedAnimations: false, languages: true, stats: false };
const future = new Date("2030-01-01T00:00:00.000Z");
const past = new Date("2020-01-01T00:00:00.000Z");
let certDir: string;
let A: string;
let B: string;
let C: string | null = null;
let slugA: string;
let slugB: string;
let userA: string;
let userB: string;

before(async () => {
  certDir = await mkdtemp(path.join(tmpdir(), "rundinova-certs-"));
  process.env.CERT_REQUESTS_DIR = certDir;
  slugA = `admin-a-${suffix}`;
  slugB = `admin-b-${suffix}`;
  const rows = await db
    .insert(tenants)
    .values([
      { slug: slugA, name: "Boutique A", status: "active", template: "vitrine", theme: DEFAULT_THEME, contact, content: starterContent("A"), scenes: [] },
      { slug: slugB, name: "Boutique B", status: "active", template: "vitrine", theme: DEFAULT_THEME, contact, content: starterContent("B"), scenes: [] },
    ])
    .returning({ id: tenants.id });
  [A, B] = rows.map((r) => r.id);
  await db.insert(subscriptions).values([
    { tenantId: A, plan: "active", status: "active", startsAt: past, endsAt: future, priceBif: 10000 },
    { tenantId: B, plan: "active", status: "active", startsAt: past, endsAt: future, priceBif: 10000 },
  ]);
  userA = (await insertVendorUser(db, { tenantId: A, identifier: `admin-a-${suffix}@exemple.test`, name: "Vendeur A" })).userId;
  userB = (await insertVendorUser(db, { tenantId: B, identifier: `admin-b-${suffix}@exemple.test`, name: "Vendeur B" })).userId;
  await db.insert(sessions).values([
    { id: `session-a-${suffix}`, userId: userA, tenantId: A, expiresAt: future },
    { id: `session-b-${suffix}`, userId: userB, tenantId: B, expiresAt: future },
  ]);
});

after(async () => {
  if (A && B) await db.delete(tenants).where(inArray(tenants.id, C ? [A, B, C] : [A, B]));
  if (certDir) await rm(certDir, { recursive: true, force: true });
  await closeDb();
});

const subEnd = async (tenantId: string) => {
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId)).orderBy(subscriptions.startsAt).limit(1);
  return row?.endsAt;
};
const statusOf = async (tenantId: string) => {
  const [row] = await db.select({ status: tenants.status }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return row?.status;
};

describe("création d'une boutique", () => {
  test("tenant, abonnement, fonctionnalités, compte et certificat sont propres à la nouvelle boutique", async () => {
    const identifier = `admin-c-${suffix}@exemple.test`;
    const created = await createVendor(
      db,
      {
        name: "Boutique C",
        slug: `admin-c-${suffix}`,
        template: "vitrine",
        locales: ["fr", "rn"],
        theme: DEFAULT_THEME,
        content: starterContent("C"),
        contact,
        features,
        account: { identifier, name: "Vendeur C" },
        trialDays: 14,
      },
      { actorUserId: null },
    );
    C = created.tenantId;
    assert.notEqual(C, A);
    assert.notEqual(C, B);
    assert.equal(created.identifier, identifier);
    assert.ok(created.temporaryPassword.length >= 10);
    assert.ok(created.whatsappUrl.startsWith("https://wa.me/25700000000?text="));
    assert.equal(decodeURIComponent(created.whatsappUrl.split("?text=")[1]).includes(identifier), true);
    assert.equal(decodeURIComponent(created.whatsappUrl.split("?text=")[1]).includes(created.temporaryPassword), true);

    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, C));
    assert.equal(sub.status, "trial");
    assert.equal(sub.plan, "essai");
    assert.ok(sub.endsAt && sub.endsAt.getTime() > Date.now());
    const featureRows = await db.select().from(tenantFeatures).where(eq(tenantFeatures.tenantId, C));
    assert.equal(featureRows.length, FEATURE_KEYS.length);
    const [account] = await db.select().from(users).where(eq(users.id, created.userId));
    assert.equal(account.tenantId, C);
    assert.equal(account.mustChangePassword, true);
    assert.equal((await subEnd(A))?.toISOString(), future.toISOString(), "l'abonnement de A est intact");
    assert.equal((await subEnd(B))?.toISOString(), future.toISOString(), "l'abonnement de B est intact");
    assert.equal(created.certificates.length, 1);
    assert.equal(created.certificates[0].host, `admin-c-${suffix}.rundinova.com`);
    assert.equal(created.certificateError, null);
  });

  test("slug réservé, slug pris et identifiant pris sont refusés", async () => {
    const input = {
      name: "Intrus",
      slug: slugA,
      template: "vitrine" as const,
      locales: ["fr" as const],
      theme: DEFAULT_THEME,
      content: starterContent("Intrus"),
      contact,
      features,
      account: { identifier: `intrus-${suffix}@exemple.test`, name: "Intrus" },
      trialDays: 14,
    };
    assert.ok(slugProblem("admin"));
    assert.ok(slugProblem("staging-krumbz"));
    await assert.rejects(createVendor(db, input, { actorUserId: null }), (e: unknown) => e instanceof VendorError && e.code === "slug_taken");
    await assert.rejects(
      createVendor(db, { ...input, slug: `intrus-${suffix}`, account: { identifier: `admin-a-${suffix}@exemple.test`, name: "Intrus" } }, { actorUserId: null }),
      (e: unknown) => e instanceof VendorError && e.code === "identifier_taken",
    );
    assert.equal((await db.select().from(tenants).where(eq(tenants.slug, `intrus-${suffix}`))).length, 0);
  });
});

describe("mutations ciblées sur un seul vendeur", () => {
  test("mise à jour du tenant A : B et son audit restent intacts", async () => {
    await updateTenant(db, A, { name: "Boutique A modifiée" }, { actorUserId: null, action: "vendor.update_info" });
    const [a] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, A));
    const [b] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, B));
    assert.equal(a.name, "Boutique A modifiée");
    assert.equal(b.name, "Boutique B");
    const [entry] = await db.select().from(auditLog).where(and(eq(auditLog.tenantId, A), eq(auditLog.action, "vendor.update_info")));
    assert.ok(entry);
    assert.deepEqual(entry.data?.fields, ["name"]);
    assert.equal((await db.select().from(auditLog).where(and(eq(auditLog.tenantId, B), eq(auditLog.action, "vendor.update_info")))).length, 0);
  });

  test("fonctionnalité et statut : A change, B ne bouge pas", async () => {
    await setFeature(db, A, "stats", true, null);
    const featuresA = await db.select().from(tenantFeatures).where(and(eq(tenantFeatures.tenantId, A), eq(tenantFeatures.key, "stats")));
    const featuresB = await db.select().from(tenantFeatures).where(and(eq(tenantFeatures.tenantId, B), eq(tenantFeatures.key, "stats")));
    assert.equal(featuresA[0].enabled, true);
    assert.equal(featuresB[0]?.enabled ?? false, false);

    await setTenantStatus(db, A, "paused", null, "test");
    assert.equal(await statusOf(A), "paused");
    assert.equal(await statusOf(B), "active");
  });

  test("identifiant vendeur unique dans toute la plateforme", async () => {
    await assert.rejects(insertVendorUser(db, { tenantId: B, identifier: `admin-a-${suffix}@exemple.test`, name: "Doublon" }), /not_found|identifier_taken|AccountError/);
    assert.equal((await db.select().from(users).where(eq(users.tenantId, B))).length, 1);
  });
});

describe("comptes vendeurs", () => {
  test("réinitialisation : mot de passe provisoire, sessions fermées, lien WhatsApp prérempli", async () => {
    await db.insert(sessions).values({ id: `session-a2-${suffix}`, userId: userA, tenantId: A, expiresAt: future });
    const reset = await resetVendorPassword(db, userA, null);
    assert.equal(reset.tenantId, A);
    assert.equal(reset.identifier, `admin-a-${suffix}@exemple.test`);
    assert.ok(reset.temporaryPassword.length >= 10);
    const message = decodeURIComponent(reset.whatsappUrl.split("?text=")[1]);
    assert.ok(message.includes(reset.identifier));
    assert.ok(message.includes("Boutique A"));
    assert.ok(message.includes(reset.temporaryPassword));
    assert.equal((await db.select().from(sessions).where(eq(sessions.userId, userA))).length, 0);
    assert.equal((await db.select().from(sessions).where(eq(sessions.userId, userB))).length, 1, "la session de B est conservée");
    const [account] = await db.select().from(users).where(eq(users.id, userA));
    assert.equal(account.mustChangePassword, true);
  });

  test("désactivation : sessions fermées pour ce compte seulement", async () => {
    await db.insert(sessions).values({ id: `session-b2-${suffix}`, userId: userB, tenantId: B, expiresAt: future });
    const result = await setVendorAccountActive(db, userB, false, null);
    assert.equal(result.tenantId, B);
    assert.equal((await db.select().from(sessions).where(eq(sessions.userId, userB))).length, 0);
    const [account] = await db.select().from(users).where(eq(users.id, userB));
    assert.equal(account.active, false);
    assert.equal((await db.select().from(users).where(eq(users.id, userA))).length, 1);
    await setVendorAccountActive(db, userB, true, null);
  });
});

describe("facturation", () => {
  test("paiement de A validé : seul l'abonnement de A est prolongé et sa boutique remise en ligne", async () => {
    await setTenantStatus(db, A, "paused", null);
    const beforeB = await subEnd(B);
    const payment = await declarePayment(db, { tenantId: A, amountBif: 50000, method: "lumicash", reference: `ref-${suffix}`, paidAt: new Date(), note: null }, null);
    const result = await validatePayment(db, payment.id, { actorUserId: null, months: 2 });
    assert.equal(result.tenantId, A);
    assert.equal(result.months, 2);
    assert.equal(result.resumed, true);
    assert.equal(await statusOf(A), "active");
    assert.equal(await statusOf(B), "active");
    assert.equal((await subEnd(B))?.toISOString(), beforeB?.toISOString());
    const [validated] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, A));
    assert.ok(validated.endsAt && validated.endsAt.getTime() > future.getTime());
  });

  test("paiement de B refusé : A intact, double traitement impossible", async () => {
    const beforeA = await subEnd(A);
    const payment = await declarePayment(db, { tenantId: B, amountBif: 10000, method: "ecocash", reference: null, paidAt: new Date(), note: null }, null);
    const rejected = await rejectPayment(db, payment.id, { actorUserId: null, reason: "Référence introuvable" });
    assert.equal(rejected.tenantId, B);
    await assert.rejects(rejectPayment(db, payment.id, { actorUserId: null, reason: "Encore" }), (e: unknown) => e instanceof BillingError && e.code === "not_pending");
    await assert.rejects(validatePayment(db, payment.id, { actorUserId: null, months: 1 }), (e: unknown) => e instanceof BillingError && e.code === "not_pending");
    assert.equal((await subEnd(A))?.toISOString(), beforeA?.toISOString());
    const [b] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, B));
    assert.equal(b.status, "active");
  });
});

describe("expiration automatique", () => {
  test("seules les boutiques échues sans abonnement valide sont mises en pause ; exécution idempotente", async () => {
    await db.update(subscriptions).set({ status: "active", endsAt: past }).where(eq(subscriptions.tenantId, A));
    // B a un abonnement échu mais aussi un abonnement sans fin : il ne doit pas être mis en pause.
    await db.insert(subscriptions).values({ tenantId: B, plan: "active", status: "active", startsAt: past, endsAt: past, priceBif: 10000 });
    await db.insert(subscriptions).values({ tenantId: B, plan: "fondateur", status: "active", startsAt: past, endsAt: null, priceBif: 0 });

    const first = await expireSubscriptions(db, { now: new Date("2026-01-01T00:00:00.000Z") });
    assert.equal(first.expired, 2);
    assert.deepEqual(new Set(first.paused), new Set([slugA]));
    assert.equal(await statusOf(A), "paused");
    assert.equal(await statusOf(B), "active");
    const [krumbz] = await db.select({ status: tenants.status }).from(tenants).where(eq(tenants.slug, "krumbz"));
    assert.equal(krumbz?.status, "active", "la boutique fondatrice n'expire pas");

    const second = await expireSubscriptions(db, { now: new Date("2026-01-01T00:00:00.000Z") });
    assert.deepEqual(second, { expired: 0, paused: [] });
  });
});

describe("validation des entrées et réglages", () => {
  test("montants, dates, identifiants et sous-domaines", () => {
    assert.equal(parseAmount("10 000 FBu"), 10000);
    assert.equal(parseAmount("-5"), null);
    assert.equal(parseAmount("abc"), null);
    assert.equal(parseDateInput("2026-11-22")?.toISOString(), "2026-11-22T00:00:00.000Z");
    assert.equal(parseDateInput("22/11/2026"), null);
    assert.equal(isUuid(A), true);
    assert.equal(isUuid("1 or 1=1"), false);
    assert.equal(normalizeSlug("Chaussures Ikirenge"), "chaussures-ikirenge");
    assert.equal(slugProblem("ikirenge"), null);
  });

  test("réglages partiels repliés sur les valeurs sûres", () => {
    const offer = mergeOffer({ monthlyPriceBif: -1, texts: { headline: { fr: "Titre" } } });
    assert.ok(offer.monthlyPriceBif >= 1);
    assert.equal(offer.texts.headline.fr, "Titre");
    assert.ok(offer.texts.monthly.fr);
    const studio = mergeStudio({ whatsapp: "", lumicash: { number: "25712345678" } });
    assert.match(studio.whatsapp, /^\d+$/);
    assert.equal(studio.lumicash.number, "25712345678");
  });
});
