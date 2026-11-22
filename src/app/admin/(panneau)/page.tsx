import Link from "next/link";
import { sql } from "drizzle-orm";
import { readHealthStatus } from "@/lib/admin/health";
import { getOfferSettings } from "@/lib/platform/settings";
import { getDb } from "@/lib/db/client";
import { payments, subscriptions, tenants } from "@/lib/db/schema";
import { currentAdmin, formatBif, formatDate } from "../_lib/server";
import { Badge, PageHeader } from "../_components/ui";

/** Super-admin home: one glance at shops, money and host health. */
export default async function AdminHome() {
  const admin = await currentAdmin();
  const db = getDb();
  const [counts] = await db
    .select({
      vendors: sql<number>`(select count(*)::int from ${tenants})`,
      online: sql<number>`(select count(*)::int from ${tenants} where ${tenants.status} = 'active')`,
      paused: sql<number>`(select count(*)::int from ${tenants} where ${tenants.status} = 'paused')`,
      pending: sql<number>`(select count(*)::int from ${payments} where ${payments.status} = 'pending')`,
      active: sql<number>`(select count(*)::int from ${subscriptions} where ${subscriptions.status} = 'active')`,
    })
    .from(tenants)
    .limit(1);
  const offer = await getOfferSettings(db);
  const health = await readHealthStatus();
  const healthLevel = health.state === "ok" ? health.report.status : "unknown";
  const recent = await db.select().from(payments).orderBy(payments.createdAt).limit(5);

  const tiles = [
    { label: "Boutiques", value: counts.vendors, detail: `${counts.online} en ligne · ${counts.paused} en pause`, href: "/vendeurs" },
    { label: "Paiements à valider", value: counts.pending, detail: `${counts.active} abonnement(s) actif(s)`, href: "/paiements" },
    { label: "Mensualité", value: formatBif(offer.monthlyPriceBif), detail: `Pack lancement ${formatBif(offer.launchPriceBif)} · essai ${offer.trialDays} j`, href: "/reglages" },
    {
      label: "Santé du serveur",
      value: healthLevel === "ok" ? "Normal" : healthLevel === "warn" ? "À surveiller" : healthLevel === "critical" ? "Critique" : "Indisponible",
      detail: health.state === "ok" ? `Rapport du ${formatDate(health.report.generatedAt, true)}` : health.state === "missing" ? "Aucun rapport reçu" : "Rapport illisible",
      href: "/sante",
    },
  ];

  return (
    <main>
      <PageHeader title={`Bonjour, ${admin.name || admin.email}`} description="Vue d'ensemble de Rundinova Studio." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className="card block transition-colors hover:border-sky-400">
            <p className="text-sm text-slate-500">{tile.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{tile.value}</p>
            <p className="mt-1 text-xs text-slate-500">{tile.detail}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="card">
          <h2 className="card-title">Derniers paiements déclarés</h2>
          {recent.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Mode</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.paidAt ?? payment.createdAt, true)}</td>
                    <td>{formatBif(payment.amountBif)}</td>
                    <td>{payment.method}</td>
                    <td>
                      <Badge tone={payment.status === "validated" ? "green" : payment.status === "pending" ? "amber" : "red"}>{payment.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-500">Aucun paiement pour le moment.</p>
          )}
          <Link href="/paiements" className="link mt-3 inline-block text-sm">
            Voir tous les paiements →
          </Link>
        </section>

        <section className="card">
          <h2 className="card-title">Actions rapides</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link className="link" href="/vendeurs">
                Créer une boutique et envoyer les accès WhatsApp
              </Link>
            </li>
            <li>
              <Link className="link" href="/reglages">
                Mettre à jour l&apos;offre et les numéros Rundinova
              </Link>
            </li>
            <li>
              <Link className="link" href="/statistiques">
                Consulter les visites et commandes WhatsApp
              </Link>
            </li>
            <li>
              <Link className="link" href="/journal">
                Vérifier le journal des modifications
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
