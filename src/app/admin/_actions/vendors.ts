"use server";

/**
 * Super-admin actions on vendors. Every action re-checks the session and re-reads
 * the tenant from the database: an id coming from a form is only a reference, never
 * a trusted source of ownership or of row contents.
 */
import { refresh } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { credentialsMessage, resetVendorPassword, setVendorAccountActive, createVendorAccount, vendorLoginUrl, whatsappLink } from "@/lib/admin/accounts";
import { contentProblems, parseContentJson, starterContent } from "@/lib/admin/content";
import { scenesProblems, starterScenes } from "@/lib/admin/scenes";
import { requestTenantCertificates, setFeature, setTenantStatus, updateTenant, VendorError, createVendor, getTenantById } from "@/lib/admin/vendors";
import { contrastWarnings, DEFAULT_THEME } from "@/lib/admin/theme";
import { isUuid, normalizeSlug, parseIdentifier, slugProblem } from "@/lib/admin/validation";
import { FEATURE_KEYS } from "@/lib/db/mappers";
import { revalidateTenant, revalidateTenants } from "@/lib/tenant/storefront";
import type { FeatureKey } from "@/lib/tenant/types";
import { adminAction, adminVoidAction } from "../_lib/server";
import { fileOf, imageProblem, mergeContentForm, mergeMediaForm, parseContact, parseFeatures, parseLocales, parseScenesForm, parseTheme } from "../_lib/parse";
import { storeTenantImage } from "../_lib/media";
import type { ActionState } from "../_lib/types";

/** Reads the tenant again from the database; a malformed or unknown id is a not-found. */
async function vendorOf(tenantId: string) {
  if (!isUuid(tenantId)) throw new VendorError("not_found", "Vendeur introuvable.");
  const tenant = await getTenantById(getDb(), tenantId);
  if (!tenant) throw new VendorError("not_found", "Vendeur introuvable.");
  return tenant;
}

/** A user id is only accepted when it belongs to this very tenant and is a vendor. */
async function accountOf(tenantId: string, userId: string) {
  if (!isUuid(userId)) throw new VendorError("not_found", "Compte introuvable.");
  const [row] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId), eq(users.role, "vendor")))
    .limit(1);
  if (!row) throw new VendorError("not_found", "Compte introuvable.");
}

const bad = (fields: Record<string, string>): ActionState => ({ error: "Corrigez les champs signalés.", fields });

/** Creates the shop + its first vendor account, and returns the credentials once. */
export async function createVendorAction(_state: ActionState | null, form: FormData): Promise<ActionState> {
  return adminAction(async (admin) => {
    const db = getDb();
    const name = String(form.get("name") ?? "").trim().slice(0, 120);
    const slug = normalizeSlug(String(form.get("slug") ?? ""));
    const locales = parseLocales(form);
    const identifier = parseIdentifier(String(form.get("identifier") ?? ""));
    const ownerName = String(form.get("ownerName") ?? "").trim().slice(0, 80) || name;
    const fields: Record<string, string> = {};
    if (!name) fields.name = "Le nom de la boutique est obligatoire.";
    const slugError = slugProblem(slug);
    if (slugError) fields.slug = slugError;
    if (!locales.includes("fr")) fields.locales = "Le français est obligatoire.";
    if (!identifier) fields.identifier = "Identifiant invalide : e-mail ou numéro avec indicatif (ex. 25768497372).";
    const contact = parseContact(form);
    Object.assign(fields, contact.fields);
    if (Object.keys(fields).length) return bad(fields);

    const created = await createVendor(
      db,
      {
        name,
        slug,
        template: "boutique",
        locales,
        theme: DEFAULT_THEME,
        content: starterContent(name),
        scenes: starterScenes(slug),
        contact: contact.contact,
        features: parseFeatures(form),
        account: { identifier: identifier!, name: ownerName },
        trialDays: 14,
        stagingCertificate: form.get("staging") === "on",
      },
      { actorUserId: admin.userId },
    );
    revalidateTenants();
    return {
      ok: true,
      message: `Boutique « ${name} » créée sur ${slug}.`,
      credentials: {
        identifier: created.identifier,
        password: created.temporaryPassword,
        whatsappUrl: created.whatsappUrl,
        loginUrl: vendorLoginUrl(),
      },
      warnings: [
        ...created.certificates.map((c) => `Certificat ${c.host} : ${c.status}${c.error ? ` — ${c.error}` : ""}.`),
        ...(created.certificateError ? [created.certificateError] : []),
      ],
    };
  });
}

/** Shop identity, languages and contact details. */
export async function updateVendorInfoAction(tenantId: string, _state: ActionState | null, form: FormData): Promise<ActionState> {
  return adminAction(async (admin) => {
    const tenant = await vendorOf(tenantId);
    const name = String(form.get("name") ?? "").trim().slice(0, 120);
    const locales = parseLocales(form);
    const contact = parseContact(form, tenant.contact);
    const fields: Record<string, string> = { ...contact.fields };
    if (!name) fields.name = "Le nom de la boutique est obligatoire.";
    if (!locales.includes("fr")) fields.locales = "Le français est obligatoire.";
    if (Object.keys(fields).length) return bad(fields);
    const slug = await updateTenant(getDb(), tenant.id, { name, locales, contact: contact.contact }, { actorUserId: admin.userId, action: "vendor.update_info" });
    revalidateTenant(slug);
    return { ok: true, message: "Informations de la boutique enregistrées." };
  });
}

export async function setVendorStatusAction(tenantId: string, status: string): Promise<void> {
  await adminVoidAction(async (admin) => {
    if (status !== "active" && status !== "trial" && status !== "paused") throw new VendorError("not_found", "Statut inconnu.");
    await vendorOf(tenantId);
    const slug = await setTenantStatus(getDb(), tenantId, status, admin.userId);
    revalidateTenant(slug);
  });
}

export async function setVendorFeatureAction(tenantId: string, key: string, enabled: boolean): Promise<void> {
  await adminVoidAction(async (admin) => {
    await vendorOf(tenantId);
    if (!(FEATURE_KEYS as readonly string[]).includes(key)) throw new VendorError("not_found", "Fonctionnalité inconnue.");
    await setFeature(getDb(), tenantId, key as FeatureKey, enabled, admin.userId);
  });
}

/** Colours, fonts, radius and optional logo upload. */
export async function updateThemeAction(tenantId: string, _state: ActionState | null, form: FormData): Promise<ActionState> {
  return adminAction(async (admin) => {
    const tenant = await vendorOf(tenantId);
    const logo = fileOf(form, "logo");
    const icon = fileOf(form, "icon");
    const problem = imageProblem(logo);
    if (problem) return bad({ logo: problem });
    const iconProblem = imageProblem(icon);
    if (iconProblem) return bad({ icon: iconProblem });
    const removeLogo = form.get("removeLogo") === "on";
    const removeIcon = form.get("removeIcon") === "on";
    const parsed = parseTheme(form, tenant.theme.logoUrl, tenant.theme.iconUrl ?? null);
    if (parsed.errors.length) return bad({ theme: parsed.errors.join(" ") });
    let logoUrl = removeLogo ? null : tenant.theme.logoUrl;
    if (logo) logoUrl = (await storeTenantImage(tenant.id, logo, admin.userId, 512)).url;
    let iconUrl = removeIcon ? null : (tenant.theme.iconUrl ?? null);
    if (icon) iconUrl = (await storeTenantImage(tenant.id, icon, admin.userId, 512)).url;
    const theme = { ...parsed.theme, logoUrl };
    delete theme.iconUrl;
    if (iconUrl) theme.iconUrl = iconUrl;
    const slug = await updateTenant(getDb(), tenant.id, { theme }, { actorUserId: admin.userId, action: "vendor.update_theme" });
    revalidateTenant(slug);
    refresh();
    return {
      ok: true,
      message: logo || icon ? "Thème et images enregistrés." : "Thème enregistré.",
      warnings: contrastWarnings(parsed.theme.colors),
    };
  });
}

/**
 * Shop texts in the template's schema: guided fields (content.<locale>.<path>), section images
 * (`mediaForm` present: media.<key> + uploads), or the full JSON editor when `contentJson` is provided.
 */
export async function updateContentAction(tenantId: string, _state: ActionState | null, form: FormData): Promise<ActionState> {
  return adminAction(async (admin) => {
    const tenant = await vendorOf(tenantId);
    const rawJson = form.get("contentJson");
    let content: Record<string, unknown>;
    if (typeof rawJson === "string") {
      const parsed = parseContentJson(rawJson);
      if (!parsed.ok) return bad({ contentJson: parsed.error });
      content = parsed.value;
    } else if (form.get("mediaForm") !== null) {
      const merged = await mergeMediaForm(form, tenant.content, async (file) => (await storeTenantImage(tenant.id, file, admin.userId, 2400)).url);
      if (Object.keys(merged.fields).length) return bad(merged.fields);
      content = merged.content;
    } else {
      const merged = mergeContentForm(form, tenant.content);
      if (Object.keys(merged.fields).length) return bad(merged.fields);
      content = merged.content;
    }
    const problems = contentProblems(content);
    if (problems.length) return bad({ contentJson: problems.join(" ") });
    const slug = await updateTenant(getDb(), tenant.id, { content }, { actorUserId: admin.userId, action: "vendor.update_content" });
    revalidateTenant(slug);
    refresh();
    return { ok: true, message: "Textes de la boutique enregistrés." };
  });
}

/**
 * Life-moment scenes: the whole ordered list is posted (scene.<i>.*, uploads sceneFile.<i>.*), then the
 * `intent` button adds / removes / moves one. Saved only when valid (≥ MIN_SCENES for a boutique).
 */
export async function updateScenesAction(tenantId: string, _state: ActionState | null, form: FormData): Promise<ActionState> {
  return adminAction(async (admin) => {
    const tenant = await vendorOf(tenantId);
    const parsed = await parseScenesForm(form, tenant.slug, async (file, kind) => {
      return (await storeTenantImage(tenant.id, file, admin.userId, kind === "landscape" ? 2400 : 1200)).url;
    });
    if (Object.keys(parsed.fields).length) return bad({ scenes: Object.values(parsed.fields).join(" ") });
    const problems = scenesProblems(parsed.scenes, tenant.template);
    if (problems.length) return bad({ scenes: problems.slice(0, 6).join(" ") });
    const slug = await updateTenant(getDb(), tenant.id, { scenes: parsed.scenes }, { actorUserId: admin.userId, action: "vendor.update_scenes" });
    revalidateTenant(slug);
    refresh();
    return { ok: true, message: `${parsed.scenes.length} scène(s) enregistrée(s).` };
  });
}

/** Adds a vendor account to an existing shop; credentials are returned once. */
export async function createAccountAction(tenantId: string, _state: ActionState | null, form: FormData): Promise<ActionState> {
  return adminAction(async (admin) => {
    const tenant = await vendorOf(tenantId);
    const identifier = parseIdentifier(String(form.get("identifier") ?? ""));
    const name = String(form.get("name") ?? "").trim().slice(0, 80);
    const fields: Record<string, string> = {};
    if (!identifier) fields.identifier = "Identifiant invalide : e-mail ou numéro avec indicatif.";
    if (!name) fields.name = "Le nom du vendeur est obligatoire.";
    if (Object.keys(fields).length) return bad(fields);
    const created = await createVendorAccount(getDb(), { tenantId: tenant.id, identifier: identifier!, name }, admin.userId);
    return {
      ok: true,
      message: "Compte vendeur créé.",
      credentials: {
        identifier: identifier!,
        password: created.temporaryPassword,
        whatsappUrl: whatsappLink(tenant.contact.whatsapp, credentialsMessage({ shopName: tenant.name, identifier: identifier!, password: created.temporaryPassword })),
        loginUrl: vendorLoginUrl(),
      },
    };
  });
}

/** Resets a vendor password: all sessions revoked, new temporary password via WhatsApp. */
export async function resetPasswordAction(tenantId: string, userId: string, _state: ActionState | null, _form: FormData): Promise<ActionState> {
  void _state;
  void _form;
  return adminAction(async (admin) => {
    await vendorOf(tenantId);
    await accountOf(tenantId, userId);
    const reset = await resetVendorPassword(getDb(), userId, admin.userId);
    return {
      ok: true,
      message: "Mot de passe réinitialisé. Envoyez les nouveaux accès au vendeur.",
      credentials: { identifier: reset.identifier, password: reset.temporaryPassword, whatsappUrl: reset.whatsappUrl, loginUrl: vendorLoginUrl() },
    };
  });
}

export async function setAccountActiveAction(tenantId: string, userId: string, active: boolean): Promise<void> {
  await adminVoidAction(async (admin) => {
    await vendorOf(tenantId);
    await accountOf(tenantId, userId);
    const owned = await setVendorAccountActive(getDb(), userId, active, admin.userId);
    if (owned.tenantId !== tenantId) throw new VendorError("not_found", "Compte introuvable.");
  });
}

/** Requests the HTTPS certificate again (host-side job writes the status file). */
export async function requestCertificateAction(tenantId: string, staging: boolean): Promise<void> {
  await adminVoidAction(async (admin) => {
    const tenant = await vendorOf(tenantId);
    await requestTenantCertificates(getDb(), tenant.id, tenant.slug, { staging, actorUserId: admin.userId });
  });
}
