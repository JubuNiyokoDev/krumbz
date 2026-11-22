import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { Empty, PageHeader } from "../../_components/ui";
import { currentAdmin, formatDate } from "../../_lib/server";
import { AUDIT_LABELS } from "@/lib/admin/audit";
import { getDb } from "@/lib/db/client";
import { auditLog, tenants, users } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Journal" };

/** Read-only audit trail of every super-admin mutation and automatic pause. */
export default async function JournalPage({ searchParams }: PageProps<"/admin/journal">) {
  await currentAdmin();
  const query = await searchParams;
  const tenantFilter = typeof query.tenant === "string" ? query.tenant : "";
  const actionFilter = typeof query.action === "string" ? query.action : "";
  const db = getDb();

  const filters = [];
  if (tenantFilter) filters.push(eq(auditLog.tenantId, tenantFilter));
  if (actionFilter) filters.push(eq(auditLog.action, actionFilter));
  const entries = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      data: auditLog.data,
      createdAt: auditLog.createdAt,
      tenantId: auditLog.tenantId,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditLog)
    .leftJoin(tenants, eq(auditLog.tenantId, tenants.id))
    .leftJoin(users, eq(auditLog.actorUserId, users.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(100);

  const actions = [...new Set(entries.map((entry) => entry.action))].sort();

  return (
    <main>
      <PageHeader title="Journal" description="100 dernières modifications. Les mots de passe et jetons ne sont jamais journalisés." />

      {actions.length > 1 ? (
        <nav className="mb-4 flex flex-wrap gap-2 text-sm" aria-label="Filtrer par action">
          <Link href="/journal" className={`btn btn-sm ${actionFilter ? "border border-slate-300 bg-white" : "bg-slate-900 text-white"}`}>
            Toutes les actions
          </Link>
          {actions.map((action) => (
            <Link
              key={action}
              href={`/journal?action=${encodeURIComponent(action)}${tenantFilter ? `&tenant=${encodeURIComponent(tenantFilter)}` : ""}`}
              className={`btn btn-sm ${actionFilter === action ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"}`}
            >
              {AUDIT_LABELS[action] ?? action}
            </Link>
          ))}
        </nav>
      ) : null}

      <section className="card">
        {entries.length === 0 ? (
          <Empty>{tenantFilter || actionFilter ? "Aucune entrée pour ce filtre." : "Aucune modification enregistrée."}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Boutique</th>
                  <th>Auteur</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap text-xs text-slate-600">{formatDate(entry.createdAt, true)}</td>
                    <td>{AUDIT_LABELS[entry.action] ?? entry.action}</td>
                    <td>
                      {entry.tenantSlug ? (
                        <Link className="link" href={`/vendeurs/${entry.tenantId ?? ""}`}>
                          {entry.tenantName ?? entry.tenantSlug}
                        </Link>
                      ) : (
                        "Plateforme"
                      )}
                    </td>
                    <td className="text-xs">{entry.actorName || entry.actorEmail || "Système"}</td>
                    <td className="max-w-md break-words font-mono text-xs text-slate-500">
                      {entry.entity ? `${entry.entity}${entry.entityId ? ` · ${entry.entityId}` : ""}` : "—"}
                      {entry.data && Object.keys(entry.data).length ? ` · ${JSON.stringify(entry.data)}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="mt-4 text-xs text-slate-500">Les entrées sont conservées dans la base et sauvegardées hors serveur avec le reste des données.</p>
    </main>
  );
}
