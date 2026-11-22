/**
 * Vendor space — WhatsApp number and contacts. Only `contact` is ever passed to
 * forTenant().tenant.update(): name, theme, texts, scenes and locales stay
 * reserved to the super-admin even though VendorTenantPatch would accept them.
 */
import { forTenant } from "../tenant/scoped.ts";
import { recordAudit } from "../tenant/audit.ts";
import type { TenantContact } from "../tenant/types.ts";
import { done, fail, type EspaceDeps, type Result } from "./context.ts";
import { parseContactForm } from "./validation.ts";

export async function loadContacts(deps: EspaceDeps): Promise<TenantContact | null> {
  const tenant = await forTenant(deps.actor.tenantId, deps.db).tenant.get();
  return tenant?.contact ?? null;
}

export async function updateContacts(deps: EspaceDeps, form: FormData): Promise<Result<TenantContact>> {
  const scope = forTenant(deps.actor.tenantId, deps.db);
  const current = await scope.tenant.get();
  if (!current) return fail("form", "not_found");
  const parsed = parseContactForm(form);
  if (!parsed.ok) return parsed;
  const updated = await scope.tenant.update({ contact: parsed.value });
  if (!updated) return fail("form", "not_found");
  const changed = (Object.keys(parsed.value) as (keyof TenantContact)[]).filter(
    (key) => JSON.stringify(current.contact[key] ?? null) !== JSON.stringify(parsed.value[key] ?? null),
  );
  await recordAudit(
    { tenantId: deps.actor.tenantId, actorUserId: deps.actor.userId, action: "contact.update", entity: "tenant", entityId: deps.actor.tenantId, data: { changed } },
    deps.db,
  );
  deps.effects.revalidate(updated.slug);
  return done(updated.contact);
}
