import type { Metadata } from "next";
import { PageHeader, Stat } from "../../_components/ui";
import { currentAdmin, formatDate } from "../../_lib/server";
import { healthStatusFile, readHealthStatus } from "@/lib/admin/health";

export const metadata: Metadata = { title: "Santé" };

const pct = (value: number) => `${Math.round(value)} %`;
const mb = (value: number | null) => (value === null ? "—" : `${Math.round(value).toLocaleString("fr-FR")} Mo`);

/** Host health report (read-only), produced every few minutes by scripts/ops/health.sh. */
export default async function HealthPage() {
  await currentAdmin();
  const health = await readHealthStatus();
  const report = health.state === "ok" ? health.report : null;

  return (
    <main>
      <PageHeader
        title="Santé du serveur"
        description="Rapport produit par la machine hôte, lu depuis un fichier monté en lecture seule dans le conteneur."
      />

      {health.state !== "ok" || !report ? (
        <section className="card" role="status">
          <h2 className="card-title">{health.state === "invalid" ? "Rapport illisible" : "Aucun rapport disponible"}</h2>
          <p className="text-sm text-slate-600">
            {health.state === "invalid"
              ? `Le fichier ${health.file} n'est pas un JSON valide : ${health.error}`
              : `Le fichier ${health.file} n'existe pas encore. Le travail cron de l'hôte (scripts/ops/health.sh) doit être installé et actif.`}
          </p>
          <p className="mt-2 font-mono text-xs text-slate-500">HEALTH_STATUS_FILE = {healthStatusFile()}</p>
        </section>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="État général"
              value={report.status === "ok" ? "Normal" : report.status === "warn" ? "À surveiller" : report.status === "critical" ? "Critique" : "Inconnu"}
              hint={`Rapport du ${report.generatedAt ? formatDate(report.generatedAt, true) : "—"}`}
            />
            <Stat label="Ancienneté du rapport" value={`${health.fileAgeMinutes} min`} hint={health.fileAgeMinutes > 15 ? "Rapport périmé : vérifier le cron hôte" : "Rapport récent"} />
            <Stat label="Mémoire disponible" value={mb(report.host.memAvailableMb)} hint={`Sur ${mb(report.host.memTotalMb)} · swap utilisé ${report.host.swapUsedPct === null ? "—" : pct(report.host.swapUsedPct)}`} />
            <Stat
              label="Sauvegarde"
              value={report.backupAgeHours === null ? "Inconnue" : `il y a ${Math.round(report.backupAgeHours)} h`}
              hint="Sauvegardes hors serveur (Cloudflare R2)"
            />
          </div>

          {report.alerts.length ? (
            <section className="card mb-6" aria-labelledby="alertes">
              <h2 id="alertes" className="card-title">
                Alertes ({report.alerts.length})
              </h2>
              <ul className="space-y-2 text-sm">
                {report.alerts.map((alert, index) => (
                  <li key={`${alert.message}-${index}`} className={`rounded-md border px-3 py-2 ${alert.level === "critical" ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                    {alert.message}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card">
              <h2 className="card-title">Disques</h2>
              {report.disks.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune donnée.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Montage</th>
                      <th>Utilisé</th>
                      <th>Libre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.disks.map((disk) => (
                      <tr key={disk.mount}>
                        <td className="font-mono text-xs">{disk.mount}</td>
                        <td>{pct(disk.usedPct)}</td>
                        <td>{mb(disk.freeMb)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="card">
              <h2 className="card-title">Application</h2>
              {report.app ? (
                <ul className="space-y-1 text-sm">
                  <li>Code HTTP : {report.app.code}</li>
                  <li>Temps de réponse : {report.app.ms} ms</li>
                  <li>Application : {report.app.ok ? "OK" : "En erreur"}</li>
                  <li>Base de données : {report.app.db ? "OK" : "En erreur"}</li>
                  <li>Charge CPU : {report.host.load.map((n) => n.toFixed(2)).join(" / ") || "—"} ({report.host.cpus ?? "—"} cœurs)</li>
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Aucune mesure applicative dans le rapport.</p>
              )}
            </section>

            <section className="card lg:col-span-2">
              <h2 className="card-title">Conteneurs</h2>
              {report.containers.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun conteneur signalé.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Conteneur</th>
                        <th>État</th>
                        <th>Santé</th>
                        <th>Mémoire</th>
                        <th>CPU</th>
                        <th>Redémarrages</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.containers.map((container) => (
                        <tr key={container.name}>
                          <td className="font-mono text-xs">{container.name}</td>
                          <td>{container.state}</td>
                          <td>{container.health || "—"}</td>
                          <td>{container.memPct === null ? "—" : pct(container.memPct)} ({mb(container.memUsedMb)} / {mb(container.memLimitMb)})</td>
                          <td>{container.cpuPct === null ? "—" : pct(container.cpuPct)}</td>
                          <td>{container.restarts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card lg:col-span-2">
              <h2 className="card-title">Boutiques</h2>
              {report.shops.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune boutique vérifiée.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Hôte</th>
                        <th>Origine</th>
                        <th>Public</th>
                        <th>État</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.shops.map((shop) => (
                        <tr key={shop.slug}>
                          <td className="font-mono text-xs">{shop.host}</td>
                          <td>{shop.originCode ?? "—"}</td>
                          <td>{shop.publicCode ?? "—"}</td>
                          <td>{shop.ok ? "OK" : "Erreur"}{shop.status ? ` · ${shop.status}` : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
