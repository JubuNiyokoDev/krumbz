import "server-only";
import { cache } from "react";
import { refresh } from "next/cache";
import { notFound, unstable_rethrow } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { requireSuperadmin } from "@/lib/auth/guards";
import { AccountError } from "@/lib/admin/accounts";
import { VendorError, getTenantById } from "@/lib/admin/vendors";
import { BillingError } from "@/lib/billing/subscriptions";
import { isUuid } from "@/lib/admin/validation";
import type { ActionState } from "./types";

/** Current super-admin (one session lookup per request). Redirects to /connexion or /mot-de-passe. */
export const currentAdmin = cache(() => requireSuperadmin());

/** Tenant of a /vendeurs/[id] page, or 404. */
export const vendorOr404 = cache(async (id: string) => {
  if (!isUuid(id)) notFound();
  const tenant = await getTenantById(getDb(), id);
  if (!tenant) notFound();
  return tenant;
});

/** Known errors → French message for the form; unknown errors are logged (without form data) and hidden. */
export function toActionError(error: unknown): ActionState {
  unstable_rethrow(error);
  if (error instanceof VendorError) return { error: error.message, fields: error.field ? { [error.field]: error.message } : undefined };
  if (error instanceof BillingError) return { error: error.message };
  if (error instanceof AccountError) {
    return { error: error.code === "identifier_taken" ? "Cet identifiant est déjà utilisé par un autre compte." : "Compte introuvable." };
  }
  console.error("[admin] action failed:", (error as Error)?.message ?? error);
  return { error: "Une erreur inattendue est survenue. Réessayez ; si elle persiste, consultez les journaux du serveur." };
}

/** Wraps a mutation: re-checks the super-admin, maps errors, refreshes the current page on success. */
export async function adminAction(run: (admin: Awaited<ReturnType<typeof requireSuperadmin>>) => Promise<ActionState>): Promise<ActionState> {
  const admin = await requireSuperadmin();
  try {
    const state = await run(admin);
    if (state.ok) refresh();
    return state;
  } catch (error) {
    return toActionError(error);
  }
}

/** Like adminAction, for a plain <form action={...}> button (no useActionState): returns void. */
export async function adminVoidAction(run: (admin: Awaited<ReturnType<typeof requireSuperadmin>>) => Promise<void>): Promise<void> {
  const admin = await requireSuperadmin();
  await run(admin);
  refresh();
}

export const formatBif = (value: number) => `${value.toLocaleString("fr-FR")} FBu`;

export function formatDate(value: Date | string | null | undefined, withTime = false): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("fr-FR", {
    timeZone: "Africa/Bujumbura",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** yyyy-mm-dd for <input type="date"> (UTC day). */
export const dateInputValue = (value: Date | null | undefined) => (value ? value.toISOString().slice(0, 10) : "");
