/**
 * Data isolation between vendors (docs/plan.md §2 « isolation stricte »).
 * Vendor A, through forTenant(A), can never read nor modify vendor B's data.
 * Runs against a migrated database (DATABASE_URL), creates two throwaway
 * tenants and deletes them afterwards.
 *
 *   npm run test:isolation
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { eq, inArray } from "drizzle-orm";
import { closeDb, getDb } from "../../src/lib/db/client.ts";
import { media, productImages, products, statsDaily, tenants } from "../../src/lib/db/schema.ts";
import { forTenant, TenantScopeError } from "../../src/lib/tenant/scoped.ts";
import { findStorefront } from "../../src/lib/tenant/queries.ts";
import { resolveHost } from "../../src/lib/tenant/hosts.ts";
import type { TenantContact, TenantTheme } from "../../src/lib/tenant/types.ts";

const db = getDb();
const suffix = randomBytes(3).toString("hex");
const theme: TenantTheme = {
  colors: { background: "#fff", surface: "#eee", primary: "#000", accent: "#f00", text: "#111", muted: "#666" },
  fonts: { display: "Inter", body: "Inter" },
  radius: "soft",
  logoUrl: null,
};
const contact: TenantContact = { whatsapp: "25700000000", phones: [], email: null, address: null, city: null, hours: null, mapUrl: null, socials: [] };

let A: string;
let B: string;
let productA: string;
let productB: string;
let hiddenB: string;

before(async () => {
  const rows = await db
    .insert(tenants)
    .values([
      { slug: `iso-a-${suffix}`, name: "A", status: "active", template: "boutique", theme, contact },
      { slug: `iso-b-${suffix}`, name: "B", status: "active", template: "boutique", theme, contact },
    ])
    .returning({ id: tenants.id });
  [A, B] = rows.map((r) => r.id);
  productA = (await forTenant(A).products.create({ slug: "shoe", name: { fr: "Chaussure A" }, price: 1000 })).id;
  productB = (await forTenant(B).products.create({ slug: "shoe", name: { fr: "Chaussure B" }, price: 2000 })).id;
  hiddenB = (await forTenant(B).products.create({ slug: "secret", name: { fr: "Caché B" }, visible: false })).id;
});

after(async () => {
  if (A && B) await db.delete(tenants).where(inArray(tenants.id, [A, B]));
  await closeDb();
});

describe("forTenant(A) never sees B", () => {
  test("product lists are disjoint", async () => {
    const listA = await forTenant(A).products.list();
    assert.deepEqual(listA.map((p) => p.id), [productA]);
    assert.ok(listA.every((p) => p.tenantId === A));
    const listB = await forTenant(B).products.list();
    assert.deepEqual(new Set(listB.map((p) => p.id)), new Set([productB, hiddenB]));
  });

  test("get / getBySlug of B's product → null", async () => {
    assert.equal(await forTenant(A).products.get(productB), null);
    assert.equal(await forTenant(A).products.get(hiddenB), null);
    assert.equal((await forTenant(A).products.getBySlug("secret")), null);
    assert.equal((await forTenant(A).products.getBySlug("shoe"))?.id, productA);
  });

  test("tenant.get returns its own tenant only", async () => {
    assert.equal((await forTenant(A).tenant.get())?.id, A);
  });
});

describe("forTenant(A) never modifies B", () => {
  test("update / setVisible / remove of B's product are no-ops", async () => {
    assert.equal(await forTenant(A).products.update(productB, { price: 1, name: { fr: "piraté" } }), null);
    assert.equal(await forTenant(A).products.setVisible(hiddenB, true), null);
    assert.equal(await forTenant(A).products.remove(productB), false);
    await forTenant(A).products.reorder([productB, hiddenB, productA]);
    const [rowB] = await db.select().from(products).where(eq(products.id, productB));
    assert.equal(rowB.price, 2000);
    assert.equal(rowB.name.fr, "Chaussure B");
    assert.equal(rowB.sortOrder, 0);
    const [rowHidden] = await db.select().from(products).where(eq(products.id, hiddenB));
    assert.equal(rowHidden.visible, false);
  });

  test("create ignores a foreign tenantId in the input", async () => {
    const input = { slug: "intrus", name: { fr: "Intrus" }, tenantId: B } as unknown as Parameters<ReturnType<typeof forTenant>["products"]["create"]>[0];
    const created = await forTenant(A).products.create(input);
    assert.equal(created.tenantId, A);
    assert.equal(await forTenant(B).products.getBySlug("intrus"), null);
    await forTenant(A).products.remove(created.id);
  });

  test("tenant.update cannot change slug, status or template", async () => {
    const patch = { name: "A2", status: "paused", template: "krumbz", slug: "hijack" } as unknown as Parameters<ReturnType<typeof forTenant>["tenant"]["update"]>[0];
    const updated = await forTenant(A).tenant.update(patch);
    assert.equal(updated?.name, "A2");
    assert.equal(updated?.status, "active");
    assert.equal(updated?.template, "boutique");
    assert.equal(updated?.slug, `iso-a-${suffix}`);
  });

  test("images cannot be attached to B's product nor use B's media", async () => {
    await assert.rejects(forTenant(A).productImages.add(productB, { url: "/x.webp", width: 1, height: 1 }), TenantScopeError);
    const mediaB = await forTenant(B).media.create({ path: `b/${suffix}.webp`, mime: "image/webp" });
    await assert.rejects(forTenant(A).productImages.add(productA, { url: "/x.webp", width: 1, height: 1, mediaId: mediaB.id }), TenantScopeError);
    assert.equal(await forTenant(A).media.get(mediaB.id), null);
    assert.equal(await forTenant(A).media.remove(mediaB.id), null);
    assert.equal((await forTenant(A).media.list()).length, 0);
    const imageB = await forTenant(B).productImages.add(productB, { url: "/b.webp", width: 10, height: 10, mediaId: mediaB.id });
    assert.equal(await forTenant(A).productImages.remove(imageB.id), false);
    assert.deepEqual(await forTenant(A).productImages.list(productB), []);
    assert.equal((await db.select().from(productImages).where(eq(productImages.id, imageB.id))).length, 1);
    assert.equal((await db.select().from(media).where(eq(media.id, mediaB.id))).length, 1);
  });

  test("stats: B's product refused, counters isolated", async () => {
    await assert.rejects(forTenant(A).stats.increment("product_view", { productId: productB }), TenantScopeError);
    await forTenant(A).stats.increment("visit", { day: "2026-01-01" });
    await forTenant(A).stats.increment("visit", { day: "2026-01-01" });
    await forTenant(B).stats.increment("visit", { day: "2026-01-01" });
    const statsA = await forTenant(A).stats.range("2026-01-01", "2026-01-01");
    assert.deepEqual(statsA.map((s) => [s.tenantId, s.count]), [[A, 2]]);
    assert.equal((await db.select().from(statsDaily).where(eq(statsDaily.tenantId, B))).length, 1);
  });

  test("billing: declared payment lands in A only, B's subscription refused", async () => {
    await assert.rejects(forTenant(A).billing.declarePayment({ amountBif: 1, method: "lumicash", subscriptionId: "00000000-0000-4000-8000-000000000000" }), TenantScopeError);
    const payment = await forTenant(A).billing.declarePayment({ amountBif: 5000, method: "lumicash" });
    assert.equal(payment.tenantId, A);
    assert.equal((await forTenant(B).billing.payments()).length, 0);
  });

  test("malformed ids are rejected, never interpolated", async () => {
    assert.throws(() => forTenant("1 or 1=1"), TenantScopeError);
    assert.equal(await forTenant(A).products.get("' or ''='"), null);
  });
});

describe("public storefront", () => {
  test("only the tenant's visible products", async () => {
    const storeB = await findStorefront(db, `iso-b-${suffix}`, "fr");
    assert.deepEqual(storeB?.products.map((p) => p.id), [productB]);
    const storeA = await findStorefront(db, `iso-a-${suffix}`, "fr");
    assert.deepEqual(storeA?.products.map((p) => p.id), [productA]);
    assert.equal(await findStorefront(db, `iso-a-${suffix}`, "en"), null, "locale not offered");
  });
});

describe("host resolution", () => {
  const root = "rundinova.com";
  test("platform and tenant hosts", () => {
    assert.deepEqual(resolveHost("krumbz.rundinova.com", { root }), { kind: "tenant", slug: "krumbz", staging: false });
    assert.deepEqual(resolveHost("staging-krumbz.rundinova.com:443", { root }), { kind: "tenant", slug: "krumbz", staging: true });
    assert.deepEqual(resolveHost("isoko.rundinova.com", { root }), { kind: "marketing", staging: false });
    assert.deepEqual(resolveHost("staging-isoko.rundinova.com", { root }), { kind: "marketing", staging: true });
    assert.deepEqual(resolveHost("staging.rundinova.com", { root }), { kind: "marketing", staging: true });
    assert.deepEqual(resolveHost("admin.rundinova.com", { root }), { kind: "admin", staging: false });
    assert.deepEqual(resolveHost("staging-espace.rundinova.com", { root }), { kind: "espace", staging: true });
  });
  test("company site, reserved and foreign hosts are not ours", () => {
    for (const host of ["rundinova.com", "www.rundinova.com", "tech.rundinova.com", "koraneza.rundinova.com", "a.b.rundinova.com", "evil.com", "krumbz.rundinova.com.evil.com", ""]) {
      assert.deepEqual(resolveHost(host, { root }), { kind: "none" }, host);
    }
  });
  test("local development", () => {
    assert.deepEqual(resolveHost("krumbz.localhost:3000", { root }), { kind: "tenant", slug: "krumbz", staging: false });
    assert.deepEqual(resolveHost("localhost:3000", { root, devTenant: "krumbz" }), { kind: "tenant", slug: "krumbz", staging: false });
    assert.deepEqual(resolveHost("localhost:3000", { root }), { kind: "marketing", staging: false });
    assert.deepEqual(resolveHost("localhost:3000", { root, devTenant: "admin" }), { kind: "marketing", staging: false });
  });
});
