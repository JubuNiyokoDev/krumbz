"use server";

/** Subscriptions, manual mobile-money payments and platform offer/contact settings. */
import { revalidateTag } from "next/cache";
import { getDb } from "@/lib/db/client";
import { audit } from "@/lib/admin/audit";
import { isUuid, parseAmount, parseDateInput } from "@/lib/admin/validation";
import { BillingError, declarePayment, PAYMENT_METHODS, rejectPayment, suggestedMonths, updateSubscription, validatePayment, type PaymentMethod } from "@/lib/billing/subscriptions";
import { getOfferSettings, getStudioSettings, mergeOffer, mergeStudio, OFFER_KEY, SETTINGS_TAG, STUDIO_KEY, writeSetting } from "@/lib/platform/settings";
import { getTenantById } from "@/lib/admin/vendors";
import { revalidateTenant } from "@/lib/tenant/storefront";
import { localizedField } from "../_lib/parse";
import { adminAction } from "../_lib/server";
import type { ActionState } from "../_lib/types";

async function tenantOf(tenantId: string) {
  if (!isUuid(tenantId)) throw new BillingError("not_found", "Vendeur introuvable.");
  const tenant = await getTenantById(getDb(), tenantId);
  if (!tenant) throw new BillingError("not_found", "Vendeur introuvable.");
  return tenant;
}

/** The super-admin records a payment received by Lumicash, EcoCash or cash. */
export async function declarePaymentAction(_state: ActionState | null, form: FormData): Promise<ActionState> {
  return adminAction(async (admin) => {
    const tenant = await tenantOf(String(form.get("tenantId") ?? ""));
    const amountBif = parseAmount(String(form.get("amount") ?? ""), { min: 1 });
    const rawMethod = String(form.get("method") ?? "");
    const method = rawMethod in PAYMENT_METHODS ? (rawMethod as PaymentMethod) : null;
    const reference = String(form.get("reference") ?? "").trim().slice(0, 100) || null;
    const note = String(form.get("note") ?? "").trim().slice(0, 500) || null;
    const paidAt = parseDateInput(String(form.get("paidAt") ?? ""));
    const fields: Record<string, string> = {};
    if (amountBif === null) fields.amount = "Montant invalide (en FBu).";
    if (!method) fields.method = "Mode de paiement inconnu.";
    if (Object.keys(fields).length) return { error: "Corrigez les champs signalés.", fields };
    await declarePayment(getDb(), { tenantId: tenant.id, amountBif: amountBif!, method: method!, reference, paidAt, note }, admin.userId);
    return { ok: true, message: `Paiement de ${amountBif!.toLocaleString("fr-FR")} FBu déclaré pour ${tenant.name}. En attente de validation.` };
  });
}

/** Validates a pending payment: extends the subscription, resumes a paused shop. */
export async function validatePaymentAction(paymentId: string, _state: ActionState | null, form: FormData): Promise<ActionState> {
  return adminAction(async (admin) => {
    if (!isUuid(paymentId)) throw new BillingError("not_found", "Paiement introuvable.");
    const db = getDb();
    const suggestion = await suggestedMonths(db, paymentId);
    const raw = String(form.get("months") ?? "").trim();
    const months = raw ? Number(raw) : null;
    if (months !== null && (!Number.isInteger(months) || months < 1 || months > 36)) {
      return { error: "Corrigez les champs signalés.", fields: { months: "Indiquez un nombre de mois entre 1 et 36." } };
    }
    const result = await validatePayment(db, paymentId, { actorUserId: admin.userId, months });
    revalidateTenant(result.slug);
    return {
      ok: true,
      message: `Paiement validé : ${result.months} mois ajouté(s)${result.resumed ? ", boutique remise en ligne" : ""}.`,
      ...(suggestion && result.kind === "manual" ? { warnings: [`Saisie manuelle : la suggestion était de ${suggestion.months} mois (${suggestion.kind === "launch" ? "pack de lancement" : "mensualité"}).`] } : {}),
    };
  });
}

export async function rejectPaymentAction(paymentId: string, _state: ActionState | null, form: FormData): Promise<ActionState> {
  return adminAction(async (admin) => {
    if (!isUuid(paymentId)) throw new BillingError("not_found", "Paiement introuvable.");
    const reason = String(form.get("reason") ?? "").trim().slice(0, 300);
    if (!reason) return { error: "Corrigez les champs signalés.", fields: { reason: "Indiquez le motif du refus." } };
    await rejectPayment(getDb(), paymentId, { actorUserId: admin.userId, reason });
    return { ok: true, message: "Paiement refusé." };
  });
}

/** Manual correction of dates / status (the expiry job does the rest). */
export async function updateSubscriptionAction(tenantId: string, _state: ActionState | null, form: FormData): Promise<ActionState> {
  return adminAction(async (admin) => {
    const tenant = await tenantOf(tenantId);
    const status = String(form.get("status") ?? "");
    if (status !== "trial" && status !== "active") return { error: "Statut d'abonnement inconnu." };
    const startsAt = parseDateInput(String(form.get("startsAt") ?? ""));
    const rawEnd = String(form.get("endsAt") ?? "").trim();
    const endsAt = rawEnd ? parseDateInput(rawEnd) : null;
    if (!startsAt || (rawEnd && !endsAt)) return { error: "Corrigez les champs signalés.", fields: { startsAt: "Dates invalides (aaaa-mm-jj)." } };
    await updateSubscription(getDb(), tenant.id, { status, startsAt: startsAt!, endsAt }, admin.userId);
    revalidateTenant(tenant.slug);
    return { ok: true, message: "Abonnement mis à jour." };
  });
}

/** Prices, trial length and localized offer texts (marketing site + billing rules). */
export async function saveOfferAction(_state: ActionState | null, form: FormData): Promise<ActionState> {
  return adminAction(async (admin) => {
    const db = getDb();
    const raw = await getOfferSettings(db);
    const launchPriceBif = parseAmount(String(form.get("launchPriceBif") ?? ""), { min: 0 });
    const monthlyPriceBif = parseAmount(String(form.get("monthlyPriceBif") ?? ""), { min: 1 });
    const launchIncludedMonths = Number(String(form.get("launchIncludedMonths") ?? ""));
    const trialDays = Number(String(form.get("trialDays") ?? ""));
    const fields: Record<string, string> = {};
    if (launchPriceBif === null) fields.launchPriceBif = "Prix de lancement invalide.";
    if (monthlyPriceBif === null) fields.monthlyPriceBif = "Mensualité invalide.";
    if (!Number.isInteger(launchIncludedMonths) || launchIncludedMonths < 0 || launchIncludedMonths > 24) fields.launchIncludedMonths = "Entre 0 et 24 mois.";
    if (!Number.isInteger(trialDays) || trialDays < 0 || trialDays > 365) fields.trialDays = "Entre 0 et 365 jours.";
    if (Object.keys(fields).length) return { error: "Corrigez les champs signalés.", fields };
    const texts = {
      headline: localizedField(form, "headline", 200) ?? raw.texts.headline,
      launch: localizedField(form, "launch", 300) ?? raw.texts.launch,
      monthly: localizedField(form, "monthly", 200) ?? raw.texts.monthly,
      note: localizedField(form, "note", 400) ?? raw.texts.note,
    };
    const offer = mergeOffer({ ...raw, launchPriceBif, monthlyPriceBif, launchIncludedMonths, trialDays, texts });
    await writeSetting(db, OFFER_KEY, offer);
    await audit(db, { actorUserId: admin.userId, action: "settings.offer", entity: "settings", entityId: OFFER_KEY });
    revalidateTag(SETTINGS_TAG, { expire: 0 });
    return { ok: true, message: "Offre et tarifs enregistrés." };
  });
}

/** Studio WhatsApp and mobile-money numbers (D4 placeholders until the owner decides). */
export async function saveStudioAction(_state: ActionState | null, form: FormData): Promise<ActionState> {
  return adminAction(async (admin) => {
    const db = getDb();
    const raw = await getStudioSettings(db);
    const whatsapp = String(form.get("whatsapp") ?? "").replace(/\D/g, "");
    const lumicash = String(form.get("lumicash") ?? "").replace(/\D/g, "");
    const ecocash = String(form.get("ecocash") ?? "").replace(/\D/g, "");
    const fields: Record<string, string> = {};
    if (!/^[1-9]\d{7,14}$/.test(whatsapp)) fields.whatsapp = "Numéro WhatsApp invalide (chiffres avec indicatif).";
    if (lumicash && !/^[1-9]\d{7,14}$/.test(lumicash)) fields.lumicash = "Numéro Lumicash invalide.";
    if (ecocash && !/^[1-9]\d{7,14}$/.test(ecocash)) fields.ecocash = "Numéro EcoCash invalide.";
    if (Object.keys(fields).length) return { error: "Corrigez les champs signalés.", fields };
    const studio = mergeStudio({
      whatsapp,
      whatsappPlaceholder: false,
      lumicash: { number: lumicash || raw.lumicash.number, name: String(form.get("lumicashName") ?? "").trim().slice(0, 80) || raw.lumicash.name, placeholder: !lumicash },
      ecocash: { number: ecocash || raw.ecocash.number, name: String(form.get("ecocashName") ?? "").trim().slice(0, 80) || raw.ecocash.name, placeholder: !ecocash },
    });
    await writeSetting(db, STUDIO_KEY, studio);
    await audit(db, { actorUserId: admin.userId, action: "settings.studio", entity: "settings", entityId: STUDIO_KEY });
    revalidateTag(SETTINGS_TAG, { expire: 0 });
    return { ok: true, message: "Coordonnées Rundinova enregistrées." };
  });
}
