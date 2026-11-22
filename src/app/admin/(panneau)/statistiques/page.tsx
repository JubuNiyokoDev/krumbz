import type { Metadata } from "next";
import Link from "next/link";
import { Empty, PageHeader, Stat } from "../../_components/ui";
import { currentAdmin, formatDate } from "../../_lib/server";
import { statsOverview, windowStart } from "@/lib/admin/stats";
import { getDb } from "@/lib/db/client";

export const metadata: Metadata = { title: "Statistiques" };

const WINDOWS = [
  { days: 7, label: "7 jours" },
  { days: 30, label: "30 jours" },
  { days: 90, label: "90 jours" },
] as const;

/** Aggregated, anonymous counters only (stats_daily): no IP, cookie or visitor id. */
export default async function StatisticsPage({ searchParams }: PageProps<"/admin/statistiques">) {
  await currentAdmin();
  const query = await searchParams;
  const rawDays = Number(Array.isArray(query.days) ? query.days[0] : query.days);
  const days = WINDOWS.some((w) => w.days === rawDays) ? rawDays : 30;
  const shops = await statsOverview(getDb(), days);
  const enabled = shops.filter((shop) => shop.enabled);
  const sum = (key: "visits" | "productViews" | "whatsappClicks") => enabled.reduce((total, shop) => total + shop[key], 0);

  return (
    <main>
      <PageHeader
        title="Statistiques"
        description={`Visites et commandes WhatsApp agrégées par jour, du ${formatDate(windowStart(days))} à aujourd'hui. Aucune donnée personnelle n'est collectée.`}
      />

      <div className="mb-6 flex flex-wrap gap-2" aria-label="Période">
        {WINDOWS.map((window) => (
          <Link
            key={window.days}
            href={`/statistiques?days=${window.days}`}
            aria-current={window.days === days ? "page" : undefined}
            className={`btn btn-sm ${window.days === days ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"}`}
          >
            {window.label}
          </Link>
        ))}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Visites" value={sum("visits").toLocaleString("fr-FR")} hint="Boutiques avec statistiques actives" />
        <Stat label="Vues produits" value={sum("productViews").toLocaleString("fr-FR")} hint="Détails de produits ouverts" />
        <Stat label="Clics WhatsApp" value={sum("whatsappClicks").toLocaleString("fr-FR")} hint="Commandes et contacts initiés" />
      </div>

      <section className="card">
        <h2 className="card-title">Par boutique ({shops.length})</h2>
        {shops.length === 0 ? (
          <Empty>Aucune boutique pour le moment.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Boutique</th>
                  <th>Suivi</th>
                  <th>Visites</th>
                  <th>Vues produits</th>
                  <th>Clics WhatsApp</th>
                  <th>Produits les plus vus</th>
                </tr>
              </thead>
              <tbody>
                {shops.map((shop) => (
                  <tr key={shop.tenantId}>
                    <td>
                      <Link className="link font-medium" href={`/vendeurs/${shop.tenantId}`}>
                        {shop.name}
                      </Link>
                      <span className="block font-mono text-xs text-slate-500">{shop.slug}</span>
                    </td>
                    <td>{shop.enabled ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900">Actif</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Désactivé</span>}</td>
                    <td>{shop.enabled ? shop.visits.toLocaleString("fr-FR") : "—"}</td>
                    <td>{shop.enabled ? shop.productViews.toLocaleString("fr-FR") : "—"}</td>
                    <td>{shop.enabled ? shop.whatsappClicks.toLocaleString("fr-FR") : "—"}</td>
                    <td className="text-xs text-slate-600">
                      {shop.topProducts.length ? shop.topProducts.map((product) => `${product.name} (${product.views})`).join(", ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="mt-4 text-xs text-slate-500">
        Le suivi s&apos;active par boutique sur sa fiche, rubrique « Fonctionnalités ». Les compteurs sont alimentés par les pages vitrines et les liens WhatsApp.
      </p>
    </main>
  );
}
