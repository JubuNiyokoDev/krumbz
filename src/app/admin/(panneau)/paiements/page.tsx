import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, ne } from "drizzle-orm";
import { ActionForm, SubmitButton } from "../../_components/ActionForm";
import { Empty, PageHeader, PaymentStatusBadge } from "../../_components/ui";
import { declarePaymentAction, rejectPaymentAction, validatePaymentAction } from "../../_actions/billing";
import { currentAdmin, dateInputValue, formatBif, formatDate } from "../../_lib/server";
import { getDb } from "@/lib/db/client";
import { payments, subscriptions, tenants } from "@/lib/db/schema";
import { PAYMENT_METHODS, SUBSCRIPTION_STATUS_LABELS, suggestedMonths } from "@/lib/billing/subscriptions";

export const metadata: Metadata = { title: "Paiements" };

/** Manual validation queue for Lumicash / EcoCash / cash payments. */
export default async function PaymentsPage() {
  await currentAdmin();
  const db = getDb();
  const pending = await db.select().from(payments).where(eq(payments.status, "pending")).orderBy(desc(payments.createdAt));
  const processed = await db.select().from(payments).where(ne(payments.status, "pending")).orderBy(desc(payments.createdAt)).limit(20);
  const subs = await db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
  const shops = await db.select({ id: tenants.id, name: tenants.name, slug: tenants.slug }).from(tenants).orderBy(tenants.name);
  const shopName = (id: string) => shops.find((shop) => shop.id === id)?.name ?? "Boutique supprimée";
  const suggestions = await Promise.all(pending.map((payment) => suggestedMonths(db, payment.id)));

  return (
    <main>
      <PageHeader title="Paiements" description="Les paiements mobile money sont validés manuellement ; la validation prolonge l'abonnement et remet la boutique en ligne." />

      <section className="card mb-6">
        <h2 className="card-title">À valider ({pending.length})</h2>
        {pending.length === 0 ? (
          <Empty>Aucun paiement en attente.</Empty>
        ) : (
          <ul className="space-y-5">
            {pending.map((payment, index) => (
              <li key={payment.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Link className="link font-semibold" href={`/vendeurs/${payment.tenantId}`}>
                    {shopName(payment.tenantId)}
                  </Link>
                  <span className="font-semibold">{formatBif(payment.amountBif)}</span>
                  <BadgeMode method={payment.method} />
                  {payment.reference ? <span className="font-mono text-xs">Réf. {payment.reference}</span> : null}
                  <span className="text-slate-500">Payé le {formatDate(payment.paidAt ?? payment.createdAt, true)}</span>
                  <PaymentStatusBadge status={payment.status} />
                </div>
                {payment.note ? <p className="mt-2 text-sm text-slate-600">{payment.note}</p> : null}
                <div className="mt-3 flex flex-wrap items-start gap-3">
                  <ActionForm action={validatePaymentAction.bind(null, payment.id)}>
                    <label className="label" htmlFor={`months-${payment.id}`}>
                      Mois à ajouter
                    </label>
                    <input
                      id={`months-${payment.id}`}
                      name="months"
                      type="number"
                      min={1}
                      max={36}
                      className="input max-w-36"
                      placeholder={suggestions[index] ? String(suggestions[index]!.months) : "1"}
                    />
                    <p className="hint">
                      {suggestions[index] ? `Suggestion : ${suggestions[index]!.months} mois (${suggestions[index]!.kind === "launch" ? "pack de lancement" : "mensualité"}).` : "Laissez vide pour calculer selon l'offre."}
                    </p>
                    <SubmitButton className="mt-2">Valider le paiement</SubmitButton>
                  </ActionForm>
                  <ActionForm action={rejectPaymentAction.bind(null, payment.id)} confirm="Refuser ce paiement ?">
                    <label className="label" htmlFor={`reason-${payment.id}`}>
                      Motif du refus
                    </label>
                    <input id={`reason-${payment.id}`} name="reason" className="input max-w-72" required maxLength={300} placeholder="Référence introuvable…" />
                    <SubmitButton variant="danger" className="mt-2">
                      Refuser
                    </SubmitButton>
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="card-title">Déclarer un paiement</h2>
          <ActionForm action={declarePaymentAction}>
            <label className="label" htmlFor="declare-shop">
              Boutique
            </label>
            <select id="declare-shop" name="tenantId" className="input" required>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name} ({shop.slug})
                </option>
              ))}
            </select>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="declare-amount">
                  Montant (FBu)
                </label>
                <input id="declare-amount" name="amount" className="input" required />
              </div>
              <div>
                <label className="label" htmlFor="declare-method">
                  Mode
                </label>
                <select id="declare-method" name="method" className="input">
                  {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="declare-ref">
                  Référence
                </label>
                <input id="declare-ref" name="reference" className="input" maxLength={100} />
              </div>
              <div>
                <label className="label" htmlFor="declare-date">
                  Date
                </label>
                <input id="declare-date" name="paidAt" type="date" className="input" defaultValue={dateInputValue(new Date())} />
              </div>
            </div>
            <div className="mt-4">
              <SubmitButton variant="secondary">Déclarer</SubmitButton>
            </div>
          </ActionForm>
        </section>

        <section className="card">
          <h2 className="card-title">Abonnements</h2>
          {subs.length === 0 ? (
            <Empty>Aucun abonnement.</Empty>
          ) : (
            <ul className="space-y-2 text-sm">
              {subs.map((sub) => (
                <li key={sub.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <Link className="link" href={`/vendeurs/${sub.tenantId}`}>
                    {shopName(sub.tenantId)}
                  </Link>
                  <span>{SUBSCRIPTION_STATUS_LABELS[sub.status] ?? sub.status} · {formatBif(sub.priceBif)}</span>
                  <span className="text-slate-500">{sub.endsAt ? `fin ${formatDate(sub.endsAt)}` : "sans fin"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card mt-6">
        <h2 className="card-title">Derniers paiements traités</h2>
        {processed.length === 0 ? (
          <Empty>Aucun paiement traité.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Boutique</th>
                  <th>Montant</th>
                  <th>Mode</th>
                  <th>Statut</th>
                  <th>Traité le</th>
                </tr>
              </thead>
              <tbody>
                {processed.map((payment) => (
                  <tr key={payment.id}>
                    <td>{shopName(payment.tenantId)}</td>
                    <td>{formatBif(payment.amountBif)}</td>
                    <td>{PAYMENT_METHODS[payment.method as keyof typeof PAYMENT_METHODS] ?? payment.method}</td>
                    <td>
                      <PaymentStatusBadge status={payment.status} />
                    </td>
                    <td>{formatDate(payment.validatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function BadgeMode({ method }: { method: string }) {
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{PAYMENT_METHODS[method as keyof typeof PAYMENT_METHODS] ?? method}</span>;
}
