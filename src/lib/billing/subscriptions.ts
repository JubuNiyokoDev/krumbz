/**
 * Subscriptions and mobile-money payments (docs/plan.md §2: manual validation by the super-admin).
 *
 * One subscription row per tenant is kept up to date (history lives in `payments` and `audit_log`):
 *   - creation: status "trial" until now + offer.trialDays,
 *   - validated payment: status "active", ends_at extended by N calendar months
 *     (from the current end when still running, from now otherwise); a paused shop is resumed,
 *   - expiry (./expire.ts): status "expired" and shop paused.
 * Months of a payment: first validated payment ≥ launch price = launch pack (includes
 * offer.launchIncludedMonths), any extra amount / monthly price; otherwise amount / monthly price.
 * The super-admin can override the number of months when validating.
 */
import { and, desc, eq, ne } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { payments, subscriptions, tenants } from "../db/schema.ts";
import { invalidateTenantRoute } from "../tenant/route-cache.ts";
import { audit } from "../admin/audit.ts";
import { getOfferSettings, type OfferSettings } from "../platform/settings.ts";

export const PAYMENT_METHODS = { lumicash: "Lumicash", ecocash: "EcoCash", especes: "Espèces", autre: "Autre" } as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  trial: "Essai",
  active: "Actif",
  expired: "Expiré",
  cancelled: "Annulé",
};

export class BillingError extends Error {
  code: "not_found" | "not_pending" | "insufficient" | "invalid";
  constructor(code: BillingError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

/** Adds calendar months in UTC; the day is clamped to the end of the target month (31 jan + 1 → 28/29 feb). */
export function addMonths(date: Date, months: number): Date {
  const day = date.getUTCDate();
  const out = new Date(date.getTime());
  out.setUTCDate(1);
  out.setUTCMonth(out.getUTCMonth() + months);
  const last = new Date(Date.UTC(out.getUTCFullYear(), out.getUTCMonth() + 1, 0)).getUTCDate();
  out.setUTCDate(Math.min(day, last));
  return out;
}

export function monthsForPayment(amountBif: number, offer: OfferSettings, isFirstPayment: boolean): { months: number; kind: "launch" | "monthly" } {
  if (isFirstPayment && amountBif >= offer.launchPriceBif) {
    return { months: offer.launchIncludedMonths + Math.floor((amountBif - offer.launchPriceBif) / offer.monthlyPriceBif), kind: "launch" };
  }
  return { months: Math.floor(amountBif / offer.monthlyPriceBif), kind: "monthly" };
}

export async function currentSubscription(db: Db, tenantId: string) {
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId)).orderBy(desc(subscriptions.createdAt)).limit(1);
  return row ?? null;
}

async function hasValidatedPayment(db: Db, tenantId: string, exceptId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.tenantId, tenantId), eq(payments.status, "validated"), ne(payments.id, exceptId)))
    .limit(1);
  return Boolean(row);
}

/** Months the validation would add (suggestion shown next to the « Valider » button). */
export async function suggestedMonths(db: Db, paymentId: string, offer?: OfferSettings) {
  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!payment) return null;
  return monthsForPayment(payment.amountBif, offer ?? (await getOfferSettings(db)), !(await hasValidatedPayment(db, payment.tenantId, payment.id)));
}

export async function declarePayment(
  db: Db,
  input: { tenantId: string; amountBif: number; method: PaymentMethod; reference: string | null; paidAt: Date | null; note: string | null },
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(payments)
      .values({ tenantId: input.tenantId, amountBif: input.amountBif, method: input.method, reference: input.reference, paidAt: input.paidAt, note: input.note, status: "pending" })
      .returning();
    await audit(tx, {
      actorUserId,
      tenantId: input.tenantId,
      action: "billing.payment_declare",
      entity: "payment",
      entityId: row.id,
      data: { amountBif: input.amountBif, method: input.method, reference: input.reference },
    });
    return row;
  });
}

export interface ValidatedPayment {
  tenantId: string;
  slug: string;
  months: number;
  kind: "launch" | "monthly" | "manual";
  endsAt: Date | null;
  resumed: boolean;
}

export async function validatePayment(
  db: Db,
  paymentId: string,
  options: { actorUserId: string | null; months?: number | null; now?: Date; offer?: OfferSettings },
): Promise<ValidatedPayment> {
  const now = options.now ?? new Date();
  const offer = options.offer ?? (await getOfferSettings(db));
  const result = await db.transaction(async (tx) => {
    const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for("update").limit(1);
    if (!payment) throw new BillingError("not_found", "Paiement introuvable.");
    if (payment.status !== "pending") throw new BillingError("not_pending", "Ce paiement a déjà été traité.");
    const [tenant] = await tx.select({ id: tenants.id, slug: tenants.slug, status: tenants.status }).from(tenants).where(eq(tenants.id, payment.tenantId)).limit(1);
    if (!tenant) throw new BillingError("not_found", "Vendeur introuvable.");

    const [firstCheck] = await tx
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.tenantId, tenant.id), eq(payments.status, "validated")))
      .limit(1);
    const suggestion = monthsForPayment(payment.amountBif, offer, !firstCheck);
    const override = options.months ?? null;
    const months = override ?? suggestion.months;
    if (!Number.isInteger(months) || months < 1 || months > 36) {
      throw new BillingError(
        "insufficient",
        `Montant insuffisant pour un mois (mensualité : ${offer.monthlyPriceBif.toLocaleString("fr-FR")} FBu). Indiquez le nombre de mois à ajouter.`,
      );
    }

    const [sub] = await tx.select().from(subscriptions).where(eq(subscriptions.tenantId, tenant.id)).orderBy(desc(subscriptions.createdAt)).limit(1).for("update");
    const running = sub && sub.status === "active" && (sub.endsAt === null || sub.endsAt > now);
    let endsAt: Date | null;
    let subscriptionId: string;
    if (sub && running && sub.endsAt === null) {
      // Open-ended subscription (e.g. founder plan): nothing to extend.
      endsAt = null;
      subscriptionId = sub.id;
    } else {
      endsAt = addMonths(running && sub.endsAt ? sub.endsAt : now, months);
      const values = {
        status: "active" as const,
        plan: "mensuel",
        startsAt: running ? sub.startsAt : now,
        endsAt,
        priceBif: offer.monthlyPriceBif,
      };
      if (sub) {
        await tx.update(subscriptions).set(values).where(eq(subscriptions.id, sub.id));
        subscriptionId = sub.id;
      } else {
        const [inserted] = await tx.insert(subscriptions).values({ tenantId: tenant.id, ...values }).returning({ id: subscriptions.id });
        subscriptionId = inserted.id;
      }
    }

    const kind = override !== null && override !== suggestion.months ? "manual" : suggestion.kind;
    const label = `${months} mois ajouté(s)${kind === "launch" ? " (pack de lancement)" : kind === "manual" ? " (saisie manuelle)" : ""}`;
    await tx
      .update(payments)
      .set({
        status: "validated",
        validatedBy: options.actorUserId,
        validatedAt: now,
        subscriptionId,
        note: payment.note ? `${payment.note} — ${label}` : label,
      })
      .where(eq(payments.id, payment.id));

    const resumed = tenant.status !== "active";
    if (resumed) await tx.update(tenants).set({ status: "active" }).where(eq(tenants.id, tenant.id));
    await audit(tx, {
      actorUserId: options.actorUserId,
      tenantId: tenant.id,
      action: "billing.payment_validate",
      entity: "payment",
      entityId: payment.id,
      data: { amountBif: payment.amountBif, method: payment.method, months, kind, endsAt: endsAt?.toISOString() ?? null, resumed, previousStatus: tenant.status },
    });
    return { tenantId: tenant.id, slug: tenant.slug, months, kind, endsAt, resumed } satisfies ValidatedPayment;
  });
  if (result.resumed) invalidateTenantRoute(result.slug);
  return result;
}

export async function rejectPayment(db: Db, paymentId: string, options: { actorUserId: string | null; reason: string; now?: Date }): Promise<{ tenantId: string }> {
  return db.transaction(async (tx) => {
    const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for("update").limit(1);
    if (!payment) throw new BillingError("not_found", "Paiement introuvable.");
    if (payment.status !== "pending") throw new BillingError("not_pending", "Ce paiement a déjà été traité.");
    const note = `Refusé : ${options.reason}`;
    await tx
      .update(payments)
      .set({ status: "rejected", validatedBy: options.actorUserId, validatedAt: options.now ?? new Date(), note: payment.note ? `${payment.note} — ${note}` : note })
      .where(eq(payments.id, payment.id));
    await audit(tx, {
      actorUserId: options.actorUserId,
      tenantId: payment.tenantId,
      action: "billing.payment_reject",
      entity: "payment",
      entityId: payment.id,
      data: { amountBif: payment.amountBif, method: payment.method, reason: options.reason },
    });
    return { tenantId: payment.tenantId };
  });
}

/** Manual edit of the subscription (dates, trial / active). An end in the past pauses the shop at the next expiry run. */
export async function updateSubscription(
  db: Db,
  tenantId: string,
  input: { status: "trial" | "active"; startsAt: Date; endsAt: Date | null },
  actorUserId: string | null,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [sub] = await tx.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId)).orderBy(desc(subscriptions.createdAt)).limit(1);
    const values = { status: input.status, startsAt: input.startsAt, endsAt: input.endsAt };
    if (sub) await tx.update(subscriptions).set(values).where(eq(subscriptions.id, sub.id));
    else await tx.insert(subscriptions).values({ tenantId, plan: input.status === "trial" ? "essai" : "mensuel", ...values });
    await audit(tx, {
      actorUserId,
      tenantId,
      action: "billing.subscription_update",
      entity: "subscription",
      entityId: sub?.id ?? null,
      data: { status: input.status, startsAt: input.startsAt.toISOString(), endsAt: input.endsAt?.toISOString() ?? null },
    });
  });
}
