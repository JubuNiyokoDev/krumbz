/**
 * Database schema of Rundinova Studio (docs/plan.md §4), Drizzle ORM / PostgreSQL 16.
 *
 * Isolation rule: every vendor-owned table carries a NOT NULL `tenant_id`
 * (indexed, ON DELETE CASCADE). Vendor-side code never queries these tables
 * directly: it goes through `forTenant(tenantId)` (src/lib/tenant/scoped.ts),
 * which adds the tenant filter to every read and write.
 *
 * Relative imports carry their `.ts` extension: the seed script and the
 * isolation tests run this file directly with Node (type stripping).
 */
import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  FeatureKey,
  Localized,
  PlatformLocale,
  TemplateId,
  TenantContact,
  TenantScene,
  TenantTheme,
} from "../tenant/types.ts";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const tenantStatus = pgEnum("tenant_status", ["active", "trial", "paused"]);
export const userRole = pgEnum("user_role", ["superadmin", "vendor"]);

/* ------------------------------------------------------------------ tenants */

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    status: tenantStatus("status").notNull().default("trial"),
    template: text("template").$type<TemplateId>().notNull().default("boutique"),
    /** First = default locale. */
    locales: text("locales").array().$type<PlatformLocale[]>().notNull().default(sql`ARRAY['fr']::text[]`),
    theme: jsonb("theme").$type<TenantTheme>().notNull(),
    contact: jsonb("contact").$type<TenantContact>().notNull(),
    /** Free-form localized texts of the template (contract: Tenant.content). */
    content: jsonb("content").$type<Record<string, unknown>>().notNull().default({}),
    scenes: jsonb("scenes").$type<TenantScene[]>().notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("tenants_slug_key").on(t.slug),
    check("tenants_slug_format", sql`${t.slug} ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'`),
    check("tenants_template_known", sql`${t.template} in ('krumbz', 'boutique')`),
  ],
);

export const tenantFeatures = pgTable(
  "tenant_features",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    key: text("key").$type<FeatureKey>().notNull(),
    enabled: boolean("enabled").notNull().default(false),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.key] })],
);

export type CertificateStatus = "pending" | "issued" | "error";

/**
 * TLS certificate of each host of a tenant (e.g. krumbz.rundinova.com, staging-krumbz.rundinova.com).
 * Requested / read through files (src/lib/tenant/certs.ts); this table keeps the last known state for the super-admin.
 */
export const tenantCertificates = pgTable(
  "tenant_certificates",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    host: text("host").notNull(),
    status: text("status").$type<CertificateStatus>().notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    error: text("error"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("tenant_certificates_host_key").on(t.host),
    index("tenant_certificates_tenant_idx").on(t.tenantId),
    check("tenant_certificates_status_known", sql`${t.status} in ('pending', 'issued', 'error')`),
  ],
);

/* ------------------------------------------------------------------ catalog */

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: jsonb("name").$type<Localized>().notNull(),
    short: jsonb("short").$type<Localized>().notNull().default({ fr: "" }),
    description: jsonb("description").$type<Localized>().notNull().default({ fr: "" }),
    /** BIF, integer. */
    price: integer("price"),
    compareAtPrice: integer("compare_at_price"),
    promoLabel: jsonb("promo_label").$type<Localized>(),
    visible: boolean("visible").notNull().default(true),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    modelUrl: text("model_url"),
    facts: jsonb("facts").$type<{ label: Localized; value: Localized }[]>().notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("products_tenant_slug_key").on(t.tenantId, t.slug),
    index("products_tenant_visible_order_idx").on(t.tenantId, t.visible, t.sortOrder),
    check("products_price_positive", sql`${t.price} is null or ${t.price} >= 0`),
    check("products_compare_at_positive", sql`${t.compareAtPrice} is null or ${t.compareAtPrice} >= 0`),
  ],
);

/** Uploaded files of a vendor (images, glTF). `path` is the storage key under /data/uploads/<tenant>/. */
export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"image" | "model">().notNull().default("image"),
    path: text("path").notNull(),
    mime: text("mime").notNull(),
    bytes: integer("bytes").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    /** Generated variants, e.g. { "640.webp": "…/640.webp", … }. */
    variants: jsonb("variants").$type<Record<string, string>>().notNull().default({}),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("media_tenant_idx").on(t.tenantId, t.createdAt), uniqueIndex("media_tenant_path_key").on(t.tenantId, t.path)],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Denormalized from products.tenant_id so that the tenant filter applies without a join. */
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id").references(() => media.id, { onDelete: "set null" }),
    url: text("url").notNull(),
    alt: jsonb("alt").$type<Localized>().notNull().default({ fr: "" }),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index("product_images_tenant_idx").on(t.tenantId),
    index("product_images_product_order_idx").on(t.productId, t.sortOrder),
  ],
);

/* ------------------------------------------------------------------ auth */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Stored lower-cased. */
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull(),
    /** NULL for super-admins, required for vendors. */
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    locale: text("locale").$type<PlatformLocale>().notNull().default("fr"),
    active: boolean("active").notNull().default(true),
    /** Set by a super-admin password reset (temporary password): the user must choose a new one at next login. */
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("users_email_key").on(t.email),
    index("users_tenant_idx").on(t.tenantId),
    check(
      "users_role_tenant",
      sql`(${t.role} = 'superadmin' and ${t.tenantId} is null) or (${t.role} = 'vendor' and ${t.tenantId} is not null)`,
    ),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the session token (the raw token only lives in the cookie). */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Copy of users.tenant_id (NULL for super-admins): scope without a join. */
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

/** Login rate limiting. `identifier` is e.g. `email:<lower-cased email>` or `ip:<sha-256 of the IP>` (never a raw IP). */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    identifier: text("identifier").notNull(),
    success: boolean("success").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("login_attempts_identifier_idx").on(t.identifier, t.createdAt)],
);

/* ------------------------------------------------------------------ billing */

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    plan: text("plan").notNull(),
    status: text("status").$type<"trial" | "active" | "expired" | "cancelled">().notNull().default("trial"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    /** NULL = no end date. */
    endsAt: timestamp("ends_at", { withTimezone: true }),
    priceBif: integer("price_bif").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("subscriptions_tenant_idx").on(t.tenantId, t.endsAt), index("subscriptions_ends_idx").on(t.status, t.endsAt)],
);

/** Mobile-money payments, validated by hand by the super-admin. */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
    amountBif: integer("amount_bif").notNull(),
    method: text("method").notNull(),
    reference: text("reference"),
    status: text("status").$type<"pending" | "validated" | "rejected">().notNull().default("pending"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    validatedBy: uuid("validated_by").references(() => users.id, { onDelete: "set null" }),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("payments_tenant_idx").on(t.tenantId, t.createdAt), index("payments_status_idx").on(t.status)],
);

/* ------------------------------------------------------------------ stats */

export type StatKind = "visit" | "product_view" | "whatsapp_click";

/** Anonymous daily counters: no IP, no cookie, no visitor id. */
export const statsDaily = pgTable(
  "stats_daily",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    kind: text("kind").$type<StatKind>().notNull(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    count: integer("count").notNull().default(0),
  },
  (t) => [
    unique("stats_daily_key").on(t.tenantId, t.day, t.kind, t.productId).nullsNotDistinct(),
    index("stats_daily_tenant_day_idx").on(t.tenantId, t.day),
  ],
);

/* ------------------------------------------------------------------ platform */

/** Platform settings (offer texts and prices…). Not vendor-owned. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: updatedAt(),
});

/** Who did what. `tenant_id` NULL = platform-level action. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: text("entity"),
    entityId: text("entity_id"),
    data: jsonb("data").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("audit_log_tenant_idx").on(t.tenantId, t.createdAt), index("audit_log_created_idx").on(t.createdAt)],
);

export type TenantRow = typeof tenants.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type ProductImageRow = typeof productImages.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type UserRow = typeof users.$inferSelect;
