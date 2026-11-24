/**
 * Vendor (tenant) administration: guided creation, certificates, features, status.
 * Framework-free (node --test runs it): the caller revalidates the Next.js caches
 * (revalidateTenant / revalidateTenants) after a change.
 */
import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { FEATURE_KEYS, toFeatures, toTenant } from "../db/mappers.ts";
import { payments, subscriptions, tenantCertificates, tenantFeatures, tenants, users } from "../db/schema.ts";
import { getCertificateStatus, recordCertificateStatus, requestCertificate, type CertificateState } from "../tenant/certs.ts";
import { rootDomain } from "../tenant/hosts.ts";
import { invalidateTenantRoute } from "../tenant/route-cache.ts";
import type { FeatureKey, PlatformLocale, Tenant, TenantContact, TenantFeatures, TenantStatus, TenantTheme } from "../tenant/types.ts";
import { AccountError, credentialsMessage, insertVendorUser, whatsappLink } from "./accounts.ts";
import { audit } from "./audit.ts";
import { slugProblem } from "./validation.ts";

export class VendorError extends Error {
  code: "slug_invalid" | "slug_taken" | "identifier_taken" | "not_found";
  field: string | null;
  constructor(code: VendorError["code"], message: string, field: string | null = null) {
    super(message);
    this.code = code;
    this.field = field;
  }
}

export interface CreateVendorInput {
  name: string;
  slug: string;
  template: "boutique";
  locales: PlatformLocale[];
  theme: TenantTheme;
  content: Record<string, unknown>;
  contact: TenantContact;
  features: TenantFeatures;
  account: { identifier: string; name: string };
  trialDays: number;
  /** Also ask a certificate for staging-<slug>.<root>. */
  stagingCertificate?: boolean;
}

export interface CreatedVendor {
  tenantId: string;
  slug: string;
  name: string;
  userId: string;
  identifier: string;
  /** Shown once to the super-admin, then sent to the vendor over WhatsApp. */
  temporaryPassword: string;
  whatsappUrl: string;
  certificates: CertificateState[];
  /** Set when the certificate request could not be written (the shop is created anyway). */
  certificateError: string | null;
}

export const shopHost = (slug: string, staging = false) => `${staging ? "staging-" : ""}${slug}.${rootDomain()}`;

export async function isSlugTaken(db: Db, slug: string): Promise<boolean> {
  const [row] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return Boolean(row);
}

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);

/** PostgreSQL error code, also when Drizzle wraps the driver error (DrizzleQueryError.cause). */
export function pgErrorCode(error: unknown): string | null {
  for (let e = error as { code?: unknown; cause?: unknown } | undefined, i = 0; e && i < 3; e = e.cause as typeof e, i++) {
    if (typeof e.code === "string") return e.code;
  }
  return null;
}

/**
 * Creates tenant + features + trial subscription + vendor account (one transaction),
 * then requests the HTTPS certificate(s) of its host(s) (file handshake, outside the transaction).
 */
export async function createVendor(db: Db, input: CreateVendorInput, ctx: { actorUserId: string | null; now?: Date }): Promise<CreatedVendor> {
  const problem = slugProblem(input.slug);
  if (problem) throw new VendorError("slug_invalid", problem, "slug");
  const now = ctx.now ?? new Date();

  let created: { tenantId: string; userId: string; temporaryPassword: string };
  try {
    created = await db.transaction(async (tx) => {
      const [taken] = await tx.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, input.slug)).limit(1);
      if (taken) throw new VendorError("slug_taken", `Le sous-domaine « ${input.slug} » est déjà pris.`, "slug");
      const [tenant] = await tx
        .insert(tenants)
        .values({
          slug: input.slug,
          name: input.name,
          status: "trial",
          template: input.template,
          locales: input.locales,
          theme: input.theme,
          contact: input.contact,
          content: input.content,
          scenes: [],
        })
        .returning({ id: tenants.id });
      await tx.insert(tenantFeatures).values(FEATURE_KEYS.map((key) => ({ tenantId: tenant.id, key, enabled: Boolean(input.features[key]) })));
      await tx.insert(subscriptions).values({ tenantId: tenant.id, plan: "essai", status: "trial", startsAt: now, endsAt: addDays(now, input.trialDays), priceBif: 0 });
      const user = await insertVendorUser(tx, { tenantId: tenant.id, identifier: input.account.identifier, name: input.account.name });
      await audit(tx, {
        actorUserId: ctx.actorUserId,
        tenantId: tenant.id,
        action: "vendor.create",
        entity: "tenant",
        entityId: tenant.id,
        data: { slug: input.slug, name: input.name, template: input.template, locales: input.locales, identifier: input.account.identifier, trialDays: input.trialDays },
      });
      return { tenantId: tenant.id, ...user };
    });
  } catch (error) {
    if (error instanceof AccountError && error.code === "identifier_taken") {
      throw new VendorError("identifier_taken", "Cet identifiant est déjà utilisé par un autre compte.", "identifier");
    }
    if (pgErrorCode(error) === "23505") {
      throw new VendorError("slug_taken", `Le sous-domaine « ${input.slug} » est déjà pris.`, "slug");
    }
    throw error;
  }

  invalidateTenantRoute(input.slug);
  let certificates: CertificateState[] = [];
  let certificateError: string | null = null;
  try {
    certificates = await requestTenantCertificates(db, created.tenantId, input.slug, { staging: input.stagingCertificate, actorUserId: ctx.actorUserId });
  } catch (error) {
    certificateError = `Demande de certificat impossible : ${(error as Error).message}`;
  }

  const message = credentialsMessage({ shopName: input.name, identifier: input.account.identifier, password: created.temporaryPassword });
  return {
    tenantId: created.tenantId,
    slug: input.slug,
    name: input.name,
    userId: created.userId,
    identifier: input.account.identifier,
    temporaryPassword: created.temporaryPassword,
    whatsappUrl: whatsappLink(input.contact.whatsapp, message),
    certificates,
    certificateError,
  };
}

/** Writes the certificate request file(s) and records them as pending. */
export async function requestTenantCertificates(
  db: Db,
  tenantId: string,
  slug: string,
  options: { staging?: boolean; actorUserId: string | null },
): Promise<CertificateState[]> {
  const hosts = [shopHost(slug), ...(options.staging ? [shopHost(slug, true)] : [])];
  const states: CertificateState[] = [];
  for (const host of hosts) {
    await requestCertificate(host);
    const state: CertificateState = { host, status: "pending", expiresAt: null, error: null };
    await recordCertificateStatus(db, tenantId, state);
    await db.update(tenantCertificates).set({ requestedAt: new Date() }).where(eq(tenantCertificates.host, host));
    states.push(state);
  }
  await audit(db, { actorUserId: options.actorUserId, tenantId, action: "vendor.certificate_request", entity: "tenant", entityId: tenantId, data: { hosts } });
  return states;
}

export type CertificateView = CertificateState & { requestedAt: Date | null; known: boolean };

/**
 * Certificate states of a tenant: the status file written by the host job wins, and is
 * mirrored into tenant_certificates; otherwise the last recorded row.
 */
export async function certificateStates(db: Db, tenantId: string, slug: string): Promise<CertificateView[]> {
  const rows = await db.select().from(tenantCertificates).where(eq(tenantCertificates.tenantId, tenantId));
  const hosts = Array.from(new Set([shopHost(slug), ...rows.map((r) => r.host)]));
  const out: CertificateView[] = [];
  for (const host of hosts) {
    const row = rows.find((r) => r.host === host);
    let file: CertificateState | null = null;
    try {
      file = await getCertificateStatus(host);
    } catch {
      file = null;
    }
    if (file && row && (file.status !== row.status || (file.expiresAt ?? null) !== (row.expiresAt?.toISOString() ?? null))) {
      await recordCertificateStatus(db, tenantId, file);
    }
    const state: CertificateState | null =
      file ?? (row ? { host, status: row.status, expiresAt: row.expiresAt?.toISOString() ?? null, error: row.error } : null);
    out.push(state ? { ...state, requestedAt: row?.requestedAt ?? null, known: true } : { host, status: "pending", expiresAt: null, error: null, requestedAt: null, known: false });
  }
  return out;
}

/** Let's Encrypt budget of the platform (docs/plan.md §2 bis): requests over the last 7 days. */
export async function certificateRequestsThisWeek(db: Db, now = new Date()): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(tenantCertificates)
    .where(gte(tenantCertificates.requestedAt, addDays(now, -7)));
  return row?.n ?? 0;
}
export const CERTIFICATE_WEEKLY_CAP = 20;

export async function getTenantById(db: Db, tenantId: string): Promise<Tenant | null> {
  const [row] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!row) return null;
  const features = await db.select({ key: tenantFeatures.key, enabled: tenantFeatures.enabled }).from(tenantFeatures).where(eq(tenantFeatures.tenantId, tenantId));
  return toTenant(row, toFeatures(features));
}

export async function setFeature(db: Db, tenantId: string, key: FeatureKey, enabled: boolean, actorUserId: string | null): Promise<void> {
  if (!FEATURE_KEYS.includes(key)) throw new VendorError("not_found", "Fonctionnalité inconnue.");
  await db.transaction(async (tx) => {
    await tx
      .insert(tenantFeatures)
      .values({ tenantId, key, enabled })
      .onConflictDoUpdate({ target: [tenantFeatures.tenantId, tenantFeatures.key], set: { enabled } });
    await audit(tx, { actorUserId, tenantId, action: "vendor.feature", entity: "tenant", entityId: tenantId, data: { key, enabled } });
  });
}

export async function setTenantStatus(db: Db, tenantId: string, status: TenantStatus, actorUserId: string | null, reason?: string): Promise<string> {
  return db.transaction(async (tx) => {
    const [row] = await tx.update(tenants).set({ status }).where(eq(tenants.id, tenantId)).returning({ slug: tenants.slug });
    if (!row) throw new VendorError("not_found", "Vendeur introuvable.");
    await audit(tx, { actorUserId, tenantId, action: "vendor.status", entity: "tenant", entityId: tenantId, data: { status, ...(reason ? { reason } : {}) } });
    return row.slug;
  });
}

/** Partial update of the tenant row by the super-admin (+ audit with the list of changed fields). */
export async function updateTenant(
  db: Db,
  tenantId: string,
  patch: Partial<Pick<Tenant, "name" | "locales" | "theme" | "contact" | "content" | "scenes">>,
  ctx: { actorUserId: string | null; action: string },
): Promise<string> {
  return db.transaction(async (tx) => {
    const [row] = await tx.update(tenants).set(patch).where(eq(tenants.id, tenantId)).returning({ slug: tenants.slug });
    if (!row) throw new VendorError("not_found", "Vendeur introuvable.");
    await audit(tx, { actorUserId: ctx.actorUserId, tenantId, action: ctx.action, entity: "tenant", entityId: tenantId, data: { fields: Object.keys(patch) } });
    return row.slug;
  });
}

export interface VendorListItem {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  template: string;
  createdAt: Date;
  subscriptionStatus: string | null;
  subscriptionEndsAt: Date | null;
  pendingPayments: number;
  accounts: number;
}

export async function listVendors(db: Db): Promise<VendorListItem[]> {
  const rows = await db
    .select({
      id: tenants.id,
      slug: tenants.slug,
      name: tenants.name,
      status: tenants.status,
      template: tenants.template,
      createdAt: tenants.createdAt,
      pendingPayments: sql<number>`(select count(*)::int from ${payments} p where p.tenant_id = ${tenants.id} and p.status = 'pending')`,
      accounts: sql<number>`(select count(*)::int from ${users} u where u.tenant_id = ${tenants.id})`,
    })
    .from(tenants)
    .orderBy(tenants.name);
  const subs = await db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
  return rows.map((row) => {
    const sub = subs.find((s) => s.tenantId === row.id);
    return { ...row, subscriptionStatus: sub?.status ?? null, subscriptionEndsAt: sub?.endsAt ?? null };
  });
}

export async function vendorAccounts(db: Db, tenantId: string) {
  return db
    .select({
      id: users.id,
      identifier: users.email,
      name: users.name,
      active: users.active,
      mustChangePassword: users.mustChangePassword,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.role, "vendor")))
    .orderBy(users.createdAt);
}
