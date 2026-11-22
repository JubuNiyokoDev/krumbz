/**
 * Vendor space — products and their photos. Every read and write goes through
 * forTenant(actor.tenantId): a product / image id of another tenant behaves as
 * "not found". After each change: audit_log entry + storefront revalidation.
 *
 * The vendor may add, edit, hide / show and reorder products, and manage their
 * photos. Never written from here: slug (after creation), featured, modelUrl
 * (super-admin), and no product deletion (owner's rule: hide instead).
 */
import { forTenant, type TenantScope } from "../tenant/scoped.ts";
import { recordAudit } from "../tenant/audit.ts";
import type { MediaRow, ProductImageRow } from "../db/schema.ts";
import type { Product, Tenant } from "../tenant/types.ts";
import { done, fail, thumbnailOf, type EspaceDeps, type Result, type StoredImageLike } from "./context.ts";
import { filesOf, LIMITS, parseAltForm, parseProductForm, slugify, type FieldError } from "./validation.ts";

type Form = FormData;

export interface DashboardProduct {
  id: string;
  name: string;
  price: number | null;
  compareAtPrice: number | null;
  promo: boolean;
  visible: boolean;
  thumb: string | null;
}

export interface EditableImage {
  id: string;
  url: string;
  thumb: string;
  alt: ProductImageRow["alt"];
  width: number;
  height: number;
}

function scopeOf(deps: EspaceDeps): TenantScope {
  return forTenant(deps.actor.tenantId, deps.db);
}

async function tenantOf(scope: TenantScope): Promise<Tenant> {
  const tenant = await scope.tenant.get();
  // The session points to a tenant that no longer exists: nothing to show.
  if (!tenant) throw new Error("Tenant of the session not found");
  return tenant;
}

async function audit(deps: EspaceDeps, action: string, entity: string, entityId: string | null, data?: Record<string, unknown>) {
  await recordAudit({ tenantId: deps.actor.tenantId, actorUserId: deps.actor.userId, action, entity, entityId, data: data ?? null }, deps.db);
}

const thumbMap = (rows: MediaRow[]) => new Map(rows.map((row) => [row.id, row.variants]));

/* ------------------------------------------------------------------ reads */

export async function loadDashboard(deps: EspaceDeps) {
  const scope = scopeOf(deps);
  const [tenant, products, media, subscriptions] = await Promise.all([
    tenantOf(scope),
    scope.products.list(),
    scope.media.list(),
    scope.billing.subscriptions(),
  ]);
  // Upload URLs are /uploads/<tenant>/<media.path>/<width>.webp.
  const variantsByKey = new Map(media.map((row) => [row.path, row.variants]));
  const thumbFor = (url: string | undefined) => (url ? thumbnailOf(url, variantsByKey.get(url.split("/")[3] ?? "")) : null);
  const items: DashboardProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name.fr,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    promo: p.compareAtPrice !== null && p.price !== null && p.compareAtPrice > p.price,
    visible: p.visible,
    thumb: thumbFor(p.images[0]?.url),
  }));
  const subscription = subscriptions[0] ?? null;
  return { tenant, products: items, subscription };
}

export async function loadProductForEdit(deps: EspaceDeps, productId: string): Promise<{ tenant: Tenant; product: Product; images: EditableImage[] } | null> {
  const scope = scopeOf(deps);
  const [tenant, product] = await Promise.all([tenantOf(scope), scope.products.get(productId)]);
  if (!product) return null;
  const [rows, media] = await Promise.all([scope.productImages.list(product.id), scope.media.list()]);
  const variants = thumbMap(media);
  const images = rows.map((row) => ({
    id: row.id,
    url: row.url,
    thumb: thumbnailOf(row.url, row.mediaId ? variants.get(row.mediaId) : undefined),
    alt: row.alt,
    width: row.width,
    height: row.height,
  }));
  return { tenant, product, images };
}

export async function loadTenant(deps: EspaceDeps): Promise<Tenant> {
  return tenantOf(scopeOf(deps));
}

/* ------------------------------------------------------------------ products */

async function uniqueSlug(scope: TenantScope, name: string): Promise<string> {
  const base = slugify(name);
  for (let n = 1; n < 100; n++) {
    const candidate = n === 1 ? base : `${base.slice(0, 56)}-${n}`;
    if (!(await scope.products.getBySlug(candidate))) return candidate;
  }
  return `${base.slice(0, 50)}-${Date.now().toString(36)}`;
}

function uploadErrorCode(error: unknown): FieldError["code"] | null {
  const code = (error as { code?: unknown })?.code;
  if (code === "too_large") return "too_large";
  if (code === "not_image" || code === "empty") return "not_image";
  return null;
}

/** Stores the files first (nothing is written in the database if one is refused). */
async function storeAll(deps: EspaceDeps, files: File[], field: string): Promise<Result<StoredImageLike[]>> {
  const stored: StoredImageLike[] = [];
  for (const file of files) {
    try {
      stored.push(await deps.effects.storeImage(deps.actor.tenantId, file));
    } catch (error) {
      await Promise.all(stored.map((s) => deps.effects.removeImage(deps.actor.tenantId, s.key)));
      const code = uploadErrorCode(error);
      if (code) return fail(field, code);
      throw error;
    }
  }
  return done(stored);
}

async function attachImages(deps: EspaceDeps, scope: TenantScope, product: Product, stored: StoredImageLike[], startAt: number, alt: Product["name"]) {
  const ids: string[] = [];
  for (const [index, image] of stored.entries()) {
    const media = await scope.media.create({
      kind: "image",
      path: image.key,
      mime: image.mime,
      bytes: image.bytes,
      width: image.width,
      height: image.height,
      variants: image.variants,
      createdBy: deps.actor.userId,
    });
    const row = await scope.productImages.add(product.id, {
      url: image.url,
      width: image.width,
      height: image.height,
      alt,
      mediaId: media.id,
      sortOrder: startAt + index,
    });
    ids.push(row.id);
  }
  return ids;
}

export async function createProduct(deps: EspaceDeps, form: Form): Promise<Result<{ id: string }>> {
  const scope = scopeOf(deps);
  const tenant = await tenantOf(scope);
  const parsed = parseProductForm(form, tenant.locales);
  const files = filesOf(form, "photos");
  const errors = parsed.ok ? [] : [...parsed.errors];
  if (files.length > LIMITS.filesPerUpload) errors.push({ field: "photos", code: "too_many", max: LIMITS.filesPerUpload });
  if (!parsed.ok || errors.length) return { ok: false, errors };

  const stored = await storeAll(deps, files, "photos");
  if (!stored.ok) return stored;

  const existing = await scope.products.list();
  const sortOrder = existing.reduce((max, p) => Math.max(max, p.sortOrder + 1), 0);
  const slug = await uniqueSlug(scope, parsed.value.name.fr);
  const product = await scope.products.create({ ...parsed.value, slug, sortOrder });
  await attachImages(deps, scope, product, stored.data, 0, { fr: parsed.value.name.fr });

  await audit(deps, "product.create", "product", product.id, { slug, price: product.price, photos: stored.data.length });
  deps.effects.revalidate(tenant.slug);
  return done({ id: product.id });
}

export async function updateProduct(deps: EspaceDeps, productId: string, form: Form): Promise<Result> {
  const scope = scopeOf(deps);
  const current = await scope.products.get(productId);
  if (!current) return fail("form", "not_found");
  const tenant = await tenantOf(scope);
  const parsed = parseProductForm(form, tenant.locales, current);
  if (!parsed.ok) return parsed;
  // Only the fields of the form: slug, featured, modelUrl and sortOrder stay untouched.
  const updated = await scope.products.update(current.id, parsed.value);
  if (!updated) return fail("form", "not_found");
  const changes: Record<string, unknown> = {};
  for (const key of ["price", "compareAtPrice", "visible"] as const) {
    if (current[key] !== updated[key]) changes[key] = { from: current[key], to: updated[key] };
  }
  await audit(deps, "product.update", "product", current.id, changes);
  deps.effects.revalidate(tenant.slug);
  return done(null);
}

export async function setProductVisibility(deps: EspaceDeps, productId: string, visible: boolean): Promise<Result> {
  const scope = scopeOf(deps);
  const updated = await scope.products.setVisible(productId, visible);
  if (!updated) return fail("form", "not_found");
  const tenant = await tenantOf(scope);
  await audit(deps, visible ? "product.show" : "product.hide", "product", updated.id);
  deps.effects.revalidate(tenant.slug);
  return done(null);
}

export async function moveProduct(deps: EspaceDeps, productId: string, direction: "up" | "down"): Promise<Result> {
  const scope = scopeOf(deps);
  const products = await scope.products.list();
  const index = products.findIndex((p) => p.id === productId);
  if (index < 0) return fail("form", "not_found");
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= products.length) return done(null);
  const ids = products.map((p) => p.id);
  [ids[index], ids[target]] = [ids[target], ids[index]];
  await scope.products.reorder(ids);
  const tenant = await tenantOf(scope);
  await audit(deps, "product.reorder", "product", productId, { direction });
  deps.effects.revalidate(tenant.slug);
  return done(null);
}

/* ------------------------------------------------------------------ photos */

export async function addProductImages(deps: EspaceDeps, productId: string, form: Form): Promise<Result<{ added: number }>> {
  const scope = scopeOf(deps);
  const product = await scope.products.get(productId);
  if (!product) return fail("form", "not_found");
  const files = filesOf(form, "photos");
  if (!files.length) return fail("photos", "required");
  if (files.length > LIMITS.filesPerUpload) return fail("photos", "too_many", LIMITS.filesPerUpload);
  const existing = await scope.productImages.list(product.id);
  if (existing.length + files.length > LIMITS.imagesPerProduct) return fail("photos", "too_many_images", LIMITS.imagesPerProduct);
  const tenant = await tenantOf(scope);
  const alt = parseAltForm(form, tenant.locales, { fr: product.name.fr });
  if (!alt.ok) return alt;
  const altValue = alt.value.fr ? alt.value : { ...alt.value, fr: product.name.fr };

  const stored = await storeAll(deps, files, "photos");
  if (!stored.ok) return stored;
  const startAt = existing.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);
  const ids = await attachImages(deps, scope, product, stored.data, startAt, altValue);

  await audit(deps, "product_image.add", "product", product.id, { images: ids });
  deps.effects.revalidate(tenant.slug);
  return done({ added: ids.length });
}

export async function updateProductImage(deps: EspaceDeps, imageId: string, form: Form): Promise<Result> {
  const scope = scopeOf(deps);
  const image = await scope.productImages.get(imageId);
  if (!image) return fail("form", "not_found");
  const tenant = await tenantOf(scope);
  const alt = parseAltForm(form, tenant.locales, image.alt);
  if (!alt.ok) return alt;
  const updated = await scope.productImages.update(image.id, { alt: alt.value });
  if (!updated) return fail("form", "not_found");
  await audit(deps, "product_image.update", "product_image", image.id, { productId: image.productId });
  deps.effects.revalidate(tenant.slug);
  return done(null);
}

export async function moveProductImage(deps: EspaceDeps, imageId: string, direction: "up" | "down"): Promise<Result> {
  const scope = scopeOf(deps);
  const image = await scope.productImages.get(imageId);
  if (!image) return fail("form", "not_found");
  const rows = await scope.productImages.list(image.productId);
  const index = rows.findIndex((row) => row.id === image.id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= rows.length) return done(null);
  const ids = rows.map((row) => row.id);
  [ids[index], ids[target]] = [ids[target], ids[index]];
  for (const [position, id] of ids.entries()) await scope.productImages.update(id, { sortOrder: position });
  const tenant = await tenantOf(scope);
  await audit(deps, "product_image.reorder", "product_image", image.id, { productId: image.productId, direction });
  deps.effects.revalidate(tenant.slug);
  return done(null);
}

/** Deletes the photo row, its media row and its files. */
export async function removeProductImage(deps: EspaceDeps, imageId: string): Promise<Result<{ productId: string }>> {
  const scope = scopeOf(deps);
  const image = await scope.productImages.get(imageId);
  if (!image) return fail("form", "not_found");
  if (!(await scope.productImages.remove(image.id))) return fail("form", "not_found");
  if (image.mediaId) {
    const media = await scope.media.remove(image.mediaId);
    if (media) await deps.effects.removeImage(deps.actor.tenantId, media.path);
  }
  const tenant = await tenantOf(scope);
  await audit(deps, "product_image.remove", "product_image", image.id, { productId: image.productId });
  deps.effects.revalidate(tenant.slug);
  return done({ productId: image.productId });
}
