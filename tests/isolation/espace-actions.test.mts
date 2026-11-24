/**
 * Isolation of the vendor-space operations (src/lib/espace/*): a vendor of shop A
 * cannot read, edit, hide, move or delete a product / photo of shop B, and cannot
 * change B's contacts. Same throwaway database as test:isolation.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { eq, inArray } from "drizzle-orm";
import { closeDb, getDb } from "../../src/lib/db/client.ts";
import { products, tenants, users } from "../../src/lib/db/schema.ts";
import { hashPassword } from "../../src/lib/db/users.ts";
import { forTenant } from "../../src/lib/tenant/scoped.ts";
import { changeVendorPassword } from "../../src/lib/espace/account.ts";
import { loadContacts, updateContacts } from "../../src/lib/espace/contacts.ts";
import { loadProductForEdit, moveProduct, moveProductImage, removeProductImage, setProductVisibility, updateProduct } from "../../src/lib/espace/products.ts";
import type { EspaceDeps } from "../../src/lib/espace/context.ts";
import type { TenantContact, TenantTheme } from "../../src/lib/tenant/types.ts";

const db = getDb();
const suffix = randomBytes(3).toString("hex");
const theme: TenantTheme = {
  colors: { background: "#fff", surface: "#eee", primary: "#000", accent: "#f00", text: "#111", muted: "#666" },
  fonts: { display: "Inter", body: "Inter" },
  radius: "soft",
  logoUrl: null,
};
const contactA: TenantContact = { whatsapp: "25768000001", phones: [], email: null, address: null, city: null, hours: null, mapUrl: null, socials: [] };
const contactB: TenantContact = { whatsapp: "25768000002", phones: [], email: null, address: null, city: null, hours: null, mapUrl: null, socials: [] };

let A: string;
let B: string;
let userIdA: string;
let userIdB: string;
let productA: string;
let productB: string;
let imageB: string;

const depsFor = (tenantId: string, userId = tenantId === A ? userIdA : userIdB): EspaceDeps => ({
  actor: { tenantId, userId },
  db,
  effects: {
    revalidate: () => {},
    storeImage: async () => { throw new Error("no upload in this test"); },
    removeImage: async () => {},
  },
});

const productForm = (name: string) => {
  const form = new FormData();
  form.set("name.fr", name);
  form.set("price", "1234");
  form.set("visible", "1");
  return form;
};

const contactForm = (whatsapp: string) => {
  const form = new FormData();
  form.set("whatsapp", whatsapp);
  form.set("email", "vendeur@example.com");
  form.set("city", "Bujumbura");
  return form;
};

before(async () => {
  const rows = await db
    .insert(tenants)
    .values([
      { slug: `esp-a-${suffix}`, name: "A", status: "active", template: "boutique", theme, contact: contactA },
      { slug: `esp-b-${suffix}`, name: "B", status: "active", template: "boutique", theme, contact: contactB },
    ])
    .returning({ id: tenants.id });
  [A, B] = rows.map((r) => r.id);
  const hash = await hashPassword("mot-de-passe-de-test");
  const userRows = await db
    .insert(users)
    .values([
      { email: `a-${suffix}@example.test`, passwordHash: hash, role: "vendor", tenantId: A, name: "A" },
      { email: `b-${suffix}@example.test`, passwordHash: hash, role: "vendor", tenantId: B, name: "B" },
    ])
    .returning({ id: users.id });
  [userIdA, userIdB] = userRows.map((r) => r.id);
  productA = (await forTenant(A).products.create({ slug: "shoe-a", name: { fr: "Chaussure A" }, price: 1000 })).id;
  productB = (await forTenant(B).products.create({ slug: "shoe-b", name: { fr: "Chaussure B" }, price: 2000 })).id;
  imageB = (await forTenant(B).productImages.add(productB, { url: "/b.webp", width: 10, height: 10 })).id;
});

after(async () => {
  if (A && B) await db.delete(tenants).where(inArray(tenants.id, [A, B]));
  await closeDb();
});

describe("espace: A never reads B", () => {
  test("product and photos of B are invisible", async () => {
    assert.equal(await loadProductForEdit(depsFor(A), productB), null);
    assert.equal((await loadProductForEdit(depsFor(A), productA))?.product.id, productA);
    assert.deepEqual(await loadContacts(depsFor(A)), contactA);
  });
});

describe("espace: A never modifies B", () => {
  test("update / hide / reorder of B's product are refused", async () => {
    const form = productForm("Piraté");
    assert.equal((await updateProduct(depsFor(A), productB, form)).ok, false);
    assert.equal((await setProductVisibility(depsFor(A), productB, false)).ok, false);
    assert.equal((await moveProduct(depsFor(A), productB, "up")).ok, false);
    const [row] = await db.select().from(products).where(eq(products.id, productB));
    assert.equal(row.name.fr, "Chaussure B");
    assert.equal(row.price, 2000);
    assert.equal(row.visible, true);
  });

  test("photos of B cannot be moved or deleted", async () => {
    assert.equal((await moveProductImage(depsFor(A), imageB, "up")).ok, false);
    assert.equal((await removeProductImage(depsFor(A), imageB)).ok, false);
    assert.equal((await forTenant(B).productImages.list(productB)).length, 1);
  });

  test("contacts update stays in A", async () => {
    const result = await updateContacts(depsFor(A), contactForm("25768000003"));
    assert.equal(result.ok, true);
    assert.equal((await loadContacts(depsFor(A)))?.whatsapp, "25768000003");
    assert.equal((await loadContacts(depsFor(B)))?.whatsapp, "25768000002");
  });

  test("password change of a foreign user is refused", async () => {
    const form = new FormData();
    form.set("current", "ancien-mot-de-passe");
    form.set("password", "nouveau-mot-de-passe-long");
    form.set("confirm", "nouveau-mot-de-passe-long");
    const result = await changeVendorPassword({ userId: "00000000-0000-4000-8000-000000000000", tenantId: B }, form, { requireCurrent: false }, db);
    assert.equal(result.ok, false);
  });

  test("own product update still works", async () => {
    const result = await updateProduct(depsFor(A), productA, productForm("Chaussure A2"));
    assert.equal(result.ok, true);
    const [row] = await db.select().from(products).where(eq(products.id, productA));
    assert.equal(row.name.fr, "Chaussure A2");
  });
});
