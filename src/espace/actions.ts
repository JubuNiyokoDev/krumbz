"use server";

/**
 * Server Actions of the vendor space. Each one authenticates (requireVendor →
 * tenant id from the session), delegates to src/lib/espace/* (validation +
 * forTenant + audit + revalidateTenant) and translates the result.
 * Ids and flags bound by the pages are re-checked: an id of another tenant is
 * simply "not found".
 */
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { espacePath } from "@/lib/auth/guards";
import { login, logout, revokeOtherSessions } from "@/lib/auth/session";
import { changeVendorPassword } from "@/lib/espace/account";
import type { Result } from "@/lib/espace/context";
import { updateContacts } from "@/lib/espace/contacts";
import {
  addProductImages,
  createProduct,
  moveProduct,
  moveProductImage,
  removeProductImage,
  setProductVisibility,
  updateProduct,
  updateProductImage,
} from "@/lib/espace/products";
import { canonicalIdentifier } from "@/lib/espace/validation";
import { recordAudit } from "@/lib/tenant/audit";
import { errorMessages, espaceLocale, espaceMessages, type EspaceMessages } from "./i18n";
import { vendorContext } from "./server";

export interface FormState {
  ok: boolean | null;
  message?: string;
  errors?: string[];
  /** Names of the invalid fields (aria-invalid + focus on the client). */
  fields?: string[];
  /** Makes two identical results distinct (the client resets / focuses on change). */
  at?: number;
}

function toState<T>(m: EspaceMessages, result: Result<T>, success: string): FormState {
  if (result.ok) return { ok: true, message: success, at: Date.now() };
  return { ok: false, errors: errorMessages(m, result.errors), fields: result.errors.map((e) => e.field), at: Date.now() };
}

/** Runs an operation; an unexpected failure (database down…) becomes null, logged without user data. */
async function attempt<T>(operation: () => Promise<Result<T>>): Promise<Result<T> | null> {
  try {
    return await operation();
  } catch (error) {
    console.error("[espace] action failed", (error as Error).message);
    return null;
  }
}

const unexpected = (m: EspaceMessages): FormState => ({ ok: false, errors: [m.errors.unexpected], at: Date.now() });

/* ------------------------------------------------------------------ auth */

export async function loginAction(rawLocale: string, _prev: FormState, form: FormData): Promise<FormState> {
  const locale = espaceLocale(rawLocale);
  const m = espaceMessages(locale);
  const identifier = typeof form.get("identifier") === "string" ? canonicalIdentifier(form.get("identifier") as string) : "";
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  if (!identifier || !password) return { ok: false, errors: [m.login.errors.missing], fields: ["identifier", "password"], at: Date.now() };

  let result;
  try {
    result = await login(identifier, password, "vendor");
  } catch (error) {
    console.error("[espace] login failed", (error as Error).message);
    return unexpected(m);
  }
  if (!result.ok) return { ok: false, errors: [m.login.errors[result.reason]], fields: ["identifier", "password"], at: Date.now() };
  await recordAudit({ tenantId: result.user.tenantId, actorUserId: result.user.userId, action: "auth.login", entity: "user", entityId: result.user.userId }).catch(() => {});
  redirect(espacePath(locale, result.user.mustChangePassword ? "/mot-de-passe" : "/"));
}

export async function logoutAction(rawLocale: string): Promise<void> {
  await logout();
  redirect(espacePath(espaceLocale(rawLocale), "/connexion"));
}

export async function passwordAction(rawLocale: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { locale, m, session } = await vendorContext(rawLocale, { allowMustChange: true });
  const forced = session.mustChangePassword;
  const result = await attempt(() =>
    changeVendorPassword({ userId: session.userId, tenantId: session.tenantId }, form, { requireCurrent: !forced }),
  );
  if (!result) return unexpected(m);
  if (result.ok) await revokeOtherSessions(session.userId, session.sessionId);
  if (result.ok && forced) redirect(`${espacePath(locale, "/")}?bienvenue=1`);
  return toState(m, result, m.password.done);
}

/* ------------------------------------------------------------------ products */

export async function createProductAction(rawLocale: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { locale, m, deps } = await vendorContext(rawLocale);
  const result = await attempt(() => createProduct(deps, form));
  if (!result) return unexpected(m);
  if (result.ok) redirect(`${espacePath(locale, `/produits/${result.data.id}`)}?cree=1`);
  return toState(m, result, "");
}

export async function updateProductAction(rawLocale: string, productId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { m, deps } = await vendorContext(rawLocale);
  const result = await attempt(() => updateProduct(deps, String(productId), form));
  if (!result) return unexpected(m);
  if (result.ok) refresh();
  return toState(m, result, m.common.saved);
}

export async function setVisibilityAction(rawLocale: string, productId: string, visible: boolean): Promise<void> {
  const { deps } = await vendorContext(rawLocale);
  await setProductVisibility(deps, String(productId), visible === true);
  refresh();
}

export async function moveProductAction(rawLocale: string, productId: string, direction: "up" | "down"): Promise<void> {
  const { deps } = await vendorContext(rawLocale);
  await moveProduct(deps, String(productId), direction === "up" ? "up" : "down");
  refresh();
}

/* ------------------------------------------------------------------ photos */

export async function addImagesAction(rawLocale: string, productId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { m, deps } = await vendorContext(rawLocale);
  const result = await attempt(() => addProductImages(deps, String(productId), form));
  if (!result) return unexpected(m);
  if (result.ok) refresh();
  return toState(m, result, m.photos.uploaded);
}

export async function updateImageAction(rawLocale: string, imageId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { m, deps } = await vendorContext(rawLocale);
  const result = await attempt(() => updateProductImage(deps, String(imageId), form));
  if (!result) return unexpected(m);
  if (result.ok) refresh();
  return toState(m, result, m.common.saved);
}

export async function moveImageAction(rawLocale: string, imageId: string, direction: "up" | "down"): Promise<void> {
  const { deps } = await vendorContext(rawLocale);
  await moveProductImage(deps, String(imageId), direction === "up" ? "up" : "down");
  refresh();
}

export async function removeImageAction(rawLocale: string, imageId: string): Promise<void> {
  const { deps } = await vendorContext(rawLocale);
  await removeProductImage(deps, String(imageId));
  refresh();
}

/* ------------------------------------------------------------------ contacts */

export async function contactsAction(rawLocale: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { m, deps } = await vendorContext(rawLocale);
  const result = await attempt(() => updateContacts(deps, form));
  if (!result) return unexpected(m);
  if (result.ok) refresh();
  return toState(m, result, m.contacts.saved);
}
