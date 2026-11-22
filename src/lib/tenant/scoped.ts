/**
 * forTenant(tenantId): the ONLY way vendor-side code reads or writes vendor data.
 *
 * Every query built here carries `tenant_id = <tenantId>`:
 * - reads filter on it, so another tenant's rows are invisible (null / []),
 * - updates and deletes filter on it, so another tenant's rows are untouched (null / false),
 * - inserts force it, whatever the input contains,
 * - cross-references (image → product, stat → product) are checked to belong to the same tenant.
 *
 * The tenantId must come from the authenticated session (sessions.tenant_id),
 * never from the request body / URL. After a write that changes the public
 * storefront, call revalidateTenant(slug) (./storefront.ts).
 */
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { getDb, type Db } from "../db/client.ts";
import {
  media,
  payments,
  productImages,
  products,
  statsDaily,
  subscriptions,
  tenantFeatures,
  tenants,
  type MediaRow,
  type StatKind,
} from "../db/schema.ts";
import { productInputToRow, toFeatures, toProduct, toTenant, type ProductInput } from "../db/mappers.ts";
import type { Localized, Product, Tenant, TenantContact, TenantScene, TenantTheme, PlatformLocale } from "./types.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class TenantScopeError extends Error {}

function assertUuid(value: string, what: string): void {
  if (!UUID.test(value)) throw new TenantScopeError(`Invalid ${what}`);
}

/** Fields of the tenant row a vendor may change (not slug, status, template, features: super-admin only). */
export type VendorTenantPatch = Partial<{
  name: string;
  contact: TenantContact;
  theme: TenantTheme;
  content: Record<string, unknown>;
  scenes: TenantScene[];
  locales: PlatformLocale[];
}>;

export function forTenant(tenantId: string, db: Db = getDb()) {
  assertUuid(tenantId, "tenant id");
  const isOwn = (table: { tenantId: AnyPgColumn }) => eq(table.tenantId, tenantId);

  const loadProducts = async (where = isOwn(products)): Promise<Product[]> => {
    const rows = await db.select().from(products).where(where).orderBy(asc(products.sortOrder), asc(products.createdAt));
    if (!rows.length) return [];
    const images = await db.select().from(productImages).where(isOwn(productImages));
    return rows.map((row) => toProduct(row, images));
  };

  const productBelongs = async (productId: string): Promise<boolean> => {
    if (!UUID.test(productId)) return false;
    const [row] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), isOwn(products)))
      .limit(1);
    return Boolean(row);
  };

  return {
    tenantId,

    tenant: {
      async get(): Promise<Tenant | null> {
        const [row] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
        if (!row) return null;
        const features = await db.select().from(tenantFeatures).where(isOwn(tenantFeatures));
        return toTenant(row, toFeatures(features));
      },
      async update(patch: VendorTenantPatch): Promise<Tenant | null> {
        const allowed: VendorTenantPatch = {};
        for (const key of ["name", "contact", "theme", "content", "scenes", "locales"] as const) {
          if (patch[key] !== undefined) (allowed as Record<string, unknown>)[key] = patch[key];
        }
        if (Object.keys(allowed).length) await db.update(tenants).set(allowed).where(eq(tenants.id, tenantId));
        return this.get();
      },
    },

    products: {
      /** All products of the tenant (hidden ones included), sorted. */
      list: () => loadProducts(),
      async get(id: string): Promise<Product | null> {
        if (!UUID.test(id)) return null;
        const [product] = await loadProducts(and(eq(products.id, id), isOwn(products)));
        return product ?? null;
      },
      async getBySlug(slug: string): Promise<Product | null> {
        const [product] = await loadProducts(and(eq(products.slug, slug), isOwn(products)));
        return product ?? null;
      },
      async create(input: ProductInput & { slug: string; name: Localized }): Promise<Product> {
        const [row] = await db
          .insert(products)
          .values({ ...productInputToRow(input), slug: input.slug, name: input.name, tenantId })
          .returning();
        return toProduct(row);
      },
      /** Returns null when the product does not exist in this tenant. */
      async update(id: string, patch: ProductInput): Promise<Product | null> {
        if (!UUID.test(id)) return null;
        const values = productInputToRow(patch);
        if (!Object.keys(values).length) return this.get(id);
        const [row] = await db
          .update(products)
          .set(values)
          .where(and(eq(products.id, id), isOwn(products)))
          .returning({ id: products.id });
        return row ? this.get(id) : null;
      },
      setVisible(id: string, visible: boolean) {
        return this.update(id, { visible });
      },
      /** Sets sortOrder from the given order; ids of other tenants are ignored. */
      async reorder(ids: string[]): Promise<void> {
        await db.transaction(async (tx) => {
          for (const [index, id] of ids.entries()) {
            if (!UUID.test(id)) continue;
            await tx.update(products).set({ sortOrder: index }).where(and(eq(products.id, id), isOwn(products)));
          }
        });
      },
      async remove(id: string): Promise<boolean> {
        if (!UUID.test(id)) return false;
        const rows = await db.delete(products).where(and(eq(products.id, id), isOwn(products))).returning({ id: products.id });
        return rows.length > 0;
      },
    },

    productImages: {
      async add(
        productId: string,
        image: { url: string; width: number; height: number; alt?: Localized; mediaId?: string | null; sortOrder?: number },
      ) {
        if (!(await productBelongs(productId))) throw new TenantScopeError("Product not found in this tenant");
        if (image.mediaId && !(await this.mediaBelongs(image.mediaId))) throw new TenantScopeError("Media not found in this tenant");
        const [row] = await db
          .insert(productImages)
          .values({
            tenantId,
            productId,
            url: image.url,
            width: image.width,
            height: image.height,
            alt: image.alt ?? { fr: "" },
            mediaId: image.mediaId ?? null,
            sortOrder: image.sortOrder ?? 0,
          })
          .returning();
        return row;
      },
      list(productId: string) {
        if (!UUID.test(productId)) return Promise.resolve([]);
        return db
          .select()
          .from(productImages)
          .where(and(eq(productImages.productId, productId), isOwn(productImages)))
          .orderBy(asc(productImages.sortOrder));
      },
      async remove(id: string): Promise<boolean> {
        if (!UUID.test(id)) return false;
        const rows = await db
          .delete(productImages)
          .where(and(eq(productImages.id, id), isOwn(productImages)))
          .returning({ id: productImages.id });
        return rows.length > 0;
      },
      async mediaBelongs(mediaId: string): Promise<boolean> {
        if (!UUID.test(mediaId)) return false;
        const [row] = await db.select({ id: media.id }).from(media).where(and(eq(media.id, mediaId), isOwn(media))).limit(1);
        return Boolean(row);
      },
    },

    media: {
      list(): Promise<MediaRow[]> {
        return db.select().from(media).where(isOwn(media)).orderBy(desc(media.createdAt));
      },
      async get(id: string): Promise<MediaRow | null> {
        if (!UUID.test(id)) return null;
        const [row] = await db.select().from(media).where(and(eq(media.id, id), isOwn(media))).limit(1);
        return row ?? null;
      },
      async create(input: Omit<typeof media.$inferInsert, "id" | "tenantId" | "createdAt">): Promise<MediaRow> {
        const [row] = await db
          .insert(media)
          .values({ ...input, tenantId })
          .returning();
        return row;
      },
      async remove(id: string): Promise<MediaRow | null> {
        if (!UUID.test(id)) return null;
        const [row] = await db.delete(media).where(and(eq(media.id, id), isOwn(media))).returning();
        return row ?? null;
      },
    },

    features: {
      async get() {
        return toFeatures(await db.select().from(tenantFeatures).where(isOwn(tenantFeatures)));
      },
    },

    stats: {
      /** +1 on today's (or `day`'s) anonymous counter. A product of another tenant is refused. */
      async increment(kind: StatKind, options: { productId?: string | null; day?: string; by?: number } = {}): Promise<void> {
        const productId = options.productId ?? null;
        if (productId && !(await productBelongs(productId))) throw new TenantScopeError("Product not found in this tenant");
        const day = options.day ?? new Date().toISOString().slice(0, 10);
        const by = options.by ?? 1;
        await db
          .insert(statsDaily)
          .values({ tenantId, day, kind, productId, count: by })
          .onConflictDoUpdate({
            target: [statsDaily.tenantId, statsDaily.day, statsDaily.kind, statsDaily.productId],
            set: { count: sql`${statsDaily.count} + ${by}` },
          });
      },
      range(from: string, to: string) {
        return db
          .select()
          .from(statsDaily)
          .where(and(isOwn(statsDaily), gte(statsDaily.day, from), lte(statsDaily.day, to)))
          .orderBy(asc(statsDaily.day));
      },
    },

    billing: {
      subscriptions() {
        return db.select().from(subscriptions).where(isOwn(subscriptions)).orderBy(desc(subscriptions.startsAt));
      },
      payments() {
        return db.select().from(payments).where(isOwn(payments)).orderBy(desc(payments.createdAt));
      },
      /** A vendor declares a mobile-money payment; the super-admin validates it. */
      async declarePayment(input: { amountBif: number; method: string; reference?: string | null; paidAt?: Date | null; subscriptionId?: string | null }) {
        if (input.subscriptionId) {
          const [own] = await db
            .select({ id: subscriptions.id })
            .from(subscriptions)
            .where(and(eq(subscriptions.id, input.subscriptionId), isOwn(subscriptions)))
            .limit(1);
          if (!own) throw new TenantScopeError("Subscription not found in this tenant");
        }
        const [row] = await db
          .insert(payments)
          .values({
            tenantId,
            amountBif: input.amountBif,
            method: input.method,
            reference: input.reference ?? null,
            paidAt: input.paidAt ?? null,
            subscriptionId: input.subscriptionId ?? null,
            status: "pending",
          })
          .returning();
        return row;
      },
    },
  };
}

export type TenantScope = ReturnType<typeof forTenant>;
