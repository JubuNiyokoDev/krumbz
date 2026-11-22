/**
 * audit_log writer: one row per super-admin mutation (and per automatic pause).
 * Never put a password, a token or personal data of shop visitors in `data`.
 */
import type { Db } from "../db/client.ts";
import { auditLog } from "../db/schema.ts";

/** A database handle or an open transaction. */
export type DbOrTx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export interface AuditEntry {
  actorUserId: string | null;
  tenantId?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  data?: Record<string, unknown> | null;
}

export async function audit(db: DbOrTx, entry: AuditEntry): Promise<void> {
  await db.insert(auditLog).values({
    actorUserId: entry.actorUserId,
    tenantId: entry.tenantId ?? null,
    action: entry.action,
    entity: entry.entity ?? null,
    entityId: entry.entityId ?? null,
    data: entry.data ?? null,
  });
}

/** French labels of the audit actions (journal page). */
export const AUDIT_LABELS: Record<string, string> = {
  "auth.password_change": "Mot de passe changé",
  "vendor.create": "Vendeur créé",
  "vendor.update_info": "Informations modifiées",
  "vendor.update_theme": "Thème modifié",
  "vendor.update_content": "Textes modifiés",
  "vendor.update_scenes": "Scènes modifiées",
  "vendor.status": "Statut de la boutique modifié",
  "vendor.feature": "Fonctionnalité modifiée",
  "vendor.certificate_request": "Certificat HTTPS demandé",
  "product.create": "Produit créé",
  "product.update": "Produit modifié",
  "product.model": "Modèle 3D téléversé",
  "account.create": "Compte vendeur créé",
  "account.reset_password": "Mot de passe vendeur réinitialisé",
  "account.active": "Compte vendeur (dés)activé",
  "billing.payment_declare": "Paiement déclaré",
  "billing.payment_validate": "Paiement validé",
  "billing.payment_reject": "Paiement refusé",
  "billing.subscription_update": "Abonnement modifié",
  "billing.expire": "Abonnement expiré : boutique en pause",
  "settings.offer": "Offre modifiée",
  "settings.studio": "Coordonnées Rundinova modifiées",
};
