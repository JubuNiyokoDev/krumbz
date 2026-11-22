import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ActionForm, SubmitButton } from "../../../_components/ActionForm";
import { Badge, CertificateBadge, Empty, PageHeader, TenantStatusBadge } from "../../../_components/ui";
import {
  createAccountAction,
  requestCertificateAction,
  resetPasswordAction,
  setAccountActiveAction,
  setVendorFeatureAction,
  setVendorStatusAction,
  updateContentAction,
  updateScenesAction,
  updateThemeAction,
  updateVendorInfoAction,
} from "../../../_actions/vendors";
import { declarePaymentAction, updateSubscriptionAction } from "../../../_actions/billing";
import { currentAdmin, dateInputValue, formatBif, formatDate, vendorOr404 } from "../../../_lib/server";
import { certificateStates } from "@/lib/admin/vendors";
import { vendorAccounts } from "@/lib/admin/vendors";
import { CONTENT_FIELDS, getAtPath } from "@/lib/admin/content";
import { BODY_FONTS, COLOR_FIELDS, DISPLAY_FONTS, RADIUS_OPTIONS } from "@/lib/admin/theme";
import { LOCALE_LABELS } from "@/lib/admin/validation";
import { getDb } from "@/lib/db/client";
import { payments, subscriptions } from "@/lib/db/schema";
import { FEATURE_KEYS } from "@/lib/db/mappers";
import { PAYMENT_METHODS, SUBSCRIPTION_STATUS_LABELS } from "@/lib/billing/subscriptions";
import { PLATFORM_LOCALES } from "@/lib/tenant/types";

export const metadata: Metadata = { title: "Fiche vendeur" };

const FEATURE_LABELS: Record<string, string> = {
  threeD: "Modèles 3D dans la boutique",
  advancedAnimations: "Animations avancées",
  languages: "Langues supplémentaires",
  stats: "Statistiques",
};

const text = (value: unknown, locale: string) => (value && typeof value === "object" ? String((value as Record<string, unknown>)[locale] ?? (value as Record<string, unknown>).fr ?? "") : "");

/** One vendor: identity, look, texts, scenes, features, accounts, subscription, certificates. */
export default async function VendorPage({ params }: PageProps<"/admin/vendeurs/[id]">) {
  await currentAdmin();
  const tenant = await vendorOr404((await params).id);
  const db = getDb();
  const [accounts, subscription, paymentList, certificates] = await Promise.all([
    vendorAccounts(db, tenant.id),
    db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenant.id)).orderBy(desc(subscriptions.createdAt)).limit(1),
    db.select().from(payments).where(eq(payments.tenantId, tenant.id)).orderBy(desc(payments.createdAt)).limit(20),
    certificateStates(db, tenant.id, tenant.slug),
  ]);
  const sub = subscription[0] ?? null;

  return (
    <main>
      <p className="mb-3 text-sm">
        <Link className="link" href="/vendeurs">
          ← Tous les vendeurs
        </Link>
      </p>
      <PageHeader
        title={tenant.name}
        description={
          <>
            <span className="font-mono">{tenant.slug}.rundinova.com</span> · {tenant.locales.map((l) => LOCALE_LABELS[l]).join(" · ")}
          </>
        }
        actions={
          <>
            <a className="btn bg-slate-900 text-white" href={`/vendeurs/${tenant.id}/qr?format=png`} target="_blank" rel="noreferrer">
              QR (PNG)
            </a>
            <a className="btn border border-slate-300 bg-white" href={`/vendeurs/${tenant.id}/qr?format=svg`} target="_blank" rel="noreferrer">
              QR (SVG)
            </a>
          </>
        }
      />

      <section className="card mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <TenantStatusBadge status={tenant.status} />
          <Badge tone="sky">{SUBSCRIPTION_STATUS_LABELS[sub?.status ?? ""] ?? "Sans abonnement"}</Badge>
          {sub?.endsAt ? <span className="text-sm text-slate-600">Fin : {formatDate(sub.endsAt, true)}</span> : null}
          <form action={setVendorStatusAction.bind(null, tenant.id, "active")}>
            <SubmitButton variant="secondary" className="btn-sm">
              Mettre en ligne
            </SubmitButton>
          </form>
          <form action={setVendorStatusAction.bind(null, tenant.id, "paused")}>
            <SubmitButton variant="danger" className="btn-sm">
              Mettre en pause
            </SubmitButton>
          </form>
        </div>
      </section>

      <div className="space-y-4">
        <details className="card" open>
          <summary className="cursor-pointer font-semibold">Identité et coordonnées</summary>
          <ActionForm action={updateVendorInfoAction.bind(null, tenant.id)} className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="vendor-name">
                  Nom de la boutique
                </label>
                <input id="vendor-name" name="name" className="input" defaultValue={tenant.name} required maxLength={120} />
              </div>
              <div>
                <label className="label" htmlFor="vendor-whatsapp">
                  WhatsApp (commandes)
                </label>
                <input id="vendor-whatsapp" name="whatsapp" className="input" defaultValue={tenant.contact.whatsapp} required maxLength={30} />
              </div>
              <div>
                <label className="label" htmlFor="vendor-email">
                  E-mail
                </label>
                <input id="vendor-email" name="email" type="email" className="input" defaultValue={tenant.contact.email ?? ""} maxLength={200} />
              </div>
              <div>
                <label className="label" htmlFor="vendor-city">
                  Ville
                </label>
                <input id="vendor-city" name="city" className="input" defaultValue={tenant.contact.city ?? ""} maxLength={80} />
              </div>
              <div className="md:col-span-2">
                <label className="label" htmlFor="vendor-address">
                  Adresse
                </label>
                <input id="vendor-address" name="address" className="input" defaultValue={tenant.contact.address ?? ""} maxLength={200} />
              </div>
              <div className="md:col-span-2">
                <label className="label" htmlFor="vendor-hours">
                  Horaires
                </label>
                <input id="vendor-hours" name="hours" className="input" defaultValue={tenant.contact.hours ?? ""} maxLength={200} />
              </div>
            </div>
            <fieldset className="mt-4">
              <legend className="label">Langues (la première est la langue par défaut)</legend>
              <div className="flex flex-wrap gap-4">
                {PLATFORM_LOCALES.map((locale) => (
                  <label key={locale} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="locales" value={locale} defaultChecked={tenant.locales.includes(locale)} /> {LOCALE_LABELS[locale]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-4">
              <SubmitButton>Enregistrer les informations</SubmitButton>
            </div>
          </ActionForm>
        </details>

        <details className="card">
          <summary className="cursor-pointer font-semibold">Apparence (thème et logo)</summary>
          <ActionForm action={updateThemeAction.bind(null, tenant.id)} className="mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              {COLOR_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="label" htmlFor={`color-${field.key}`}>
                    {field.label}
                  </label>
                  <input id={`color-${field.key}`} name={`color.${field.key}`} type="color" className="input h-11" defaultValue={tenant.theme.colors[field.key]} />
                </div>
              ))}
              <div>
                <label className="label" htmlFor="fontDisplay">
                  Police des titres
                </label>
                <select id="fontDisplay" name="fontDisplay" className="input" defaultValue={tenant.theme.fonts.display}>
                  {DISPLAY_FONTS.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="fontBody">
                  Police du texte
                </label>
                <select id="fontBody" name="fontBody" className="input" defaultValue={tenant.theme.fonts.body}>
                  {BODY_FONTS.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="radius">
                  Coins
                </label>
                <select id="radius" name="radius" className="input" defaultValue={tenant.theme.radius}>
                  {RADIUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label" htmlFor="logo">
                  Logo (facultatif, 8 Mo maximum)
                </label>
                <input id="logo" name="logo" type="file" accept="image/*" className="input" />
                {tenant.theme.logoUrl ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Logo actuel : <span className="break-all">{tenant.theme.logoUrl}</span>
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-4">
              <SubmitButton>Enregistrer le thème</SubmitButton>
            </div>
          </ActionForm>
        </details>

        <details className="card">
          <summary className="cursor-pointer font-semibold">Textes de la boutique</summary>
          <ActionForm action={updateContentAction.bind(null, tenant.id)} className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {CONTENT_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="label" htmlFor={`content-${field.key}`}>
                    {field.label}
                  </label>
                  {field.multiline ? (
                    <textarea id={`content-${field.key}`} name={`content.${field.key}.fr`} className="input" rows={3} maxLength={field.max} defaultValue={text(getAtPath(tenant.content, field.key), "fr")} />
                  ) : (
                    <input id={`content-${field.key}`} name={`content.${field.key}.fr`} className="input" maxLength={field.max} defaultValue={text(getAtPath(tenant.content, field.key), "fr")} />
                  )}
                  {tenant.locales.filter((l) => l !== "fr").map((locale) => (
                    <input key={locale} name={`content.${field.key}.${locale}`} className="input mt-1" placeholder={`${LOCALE_LABELS[locale]} (facultatif)`} maxLength={field.max} defaultValue={text(getAtPath(tenant.content, field.key), locale)} />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <SubmitButton>Enregistrer les textes</SubmitButton>
            </div>
          </ActionForm>
          <ActionForm action={updateContentAction.bind(null, tenant.id)} className="mt-6 border-t border-slate-200 pt-4">
            <label className="label" htmlFor="content-json">
              Contenu avancé (JSON)
            </label>
            <textarea id="content-json" name="contentJson" className="input font-mono text-xs" rows={10} defaultValue={JSON.stringify(tenant.content, null, 2)} />
            <p className="hint">Remplace tout le contenu. Laisser vide pour repartir d&apos;un objet vide.</p>
            <div className="mt-3">
              <SubmitButton variant="secondary">Remplacer le contenu (JSON)</SubmitButton>
            </div>
          </ActionForm>
        </details>

        <details className="card">
          <summary className="cursor-pointer font-semibold">Scènes photo</summary>
          <ActionForm action={updateScenesAction.bind(null, tenant.id)} className="mt-4">
            <label className="label" htmlFor="scenes">
              Scènes (JSON) — 12 maximum
            </label>
            <textarea id="scenes" name="scenes" className="input font-mono text-xs" rows={12} defaultValue={JSON.stringify(tenant.scenes, null, 2)} />
            <p className="hint">Chaque scène : id, imageUrl, label, title, text, alt (objets avec au moins une clé « fr »). Pour remplacer une image, joignez un fichier portant le même index ci-dessous.</p>
            {tenant.scenes.map((scene, index) => (
              <div key={scene.id} className="mt-2">
                <label className="label" htmlFor={`scene-${index}`}>
                  Image de la scène {index + 1} (facultatif)
                </label>
                <input id={`scene-${index}`} name={`sceneImage.${index}`} type="file" accept="image/*" className="input" />
              </div>
            ))}
            <div className="mt-4">
              <SubmitButton>Enregistrer les scènes</SubmitButton>
            </div>
          </ActionForm>
        </details>

        <details className="card">
          <summary className="cursor-pointer font-semibold">Fonctionnalités</summary>
          <ul className="mt-4 space-y-3">
            {FEATURE_KEYS.map((key) => (
              <li key={key} className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm">{FEATURE_LABELS[key]}</span>
                <div className="flex gap-2">
                  <form action={setVendorFeatureAction.bind(null, tenant.id, key, true)}>
                    <SubmitButton variant={tenant.features[key] ? "primary" : "secondary"} className="btn-sm">
                      Activer
                    </SubmitButton>
                  </form>
                  <form action={setVendorFeatureAction.bind(null, tenant.id, key, false)}>
                    <SubmitButton variant={!tenant.features[key] ? "primary" : "secondary"} className="btn-sm">
                      Désactiver
                    </SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </details>

        <details className="card">
          <summary className="cursor-pointer font-semibold">Comptes vendeurs ({accounts.length})</summary>
          {accounts.length === 0 ? (
          <div className="mt-4">
            <Empty>Aucun compte vendeur.</Empty>
          </div>
        ) : null}
          <ul className="mt-4 space-y-4">
            {accounts.map((account) => (
              <li key={account.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <strong className="text-sm">{account.name}</strong>
                  <span className="font-mono text-xs text-slate-600">{account.identifier}</span>
                  {account.active ? <Badge tone="green">Actif</Badge> : <Badge tone="red">Désactivé</Badge>}
                  {account.mustChangePassword ? <Badge tone="amber">Mot de passe à changer</Badge> : null}
                  <span className="text-xs text-slate-500">Dernière connexion : {formatDate(account.lastLoginAt, true)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionForm action={resetPasswordAction.bind(null, tenant.id, account.id)} confirm="Réinitialiser le mot de passe et déconnecter toutes les sessions de ce compte ?">
                    <SubmitButton variant="danger" className="btn-sm">
                      Réinitialiser le mot de passe
                    </SubmitButton>
                  </ActionForm>
                  <form action={setAccountActiveAction.bind(null, tenant.id, account.id, !account.active)}>
                    <SubmitButton variant="secondary" className="btn-sm">
                      {account.active ? "Désactiver" : "Activer"} le compte
                    </SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
          <ActionForm action={createAccountAction.bind(null, tenant.id)} className="mt-6 border-t border-slate-200 pt-4">
            <h3 className="card-title">Ajouter un compte vendeur</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="new-account-name">
                  Nom
                </label>
                <input id="new-account-name" name="name" className="input" required maxLength={80} />
              </div>
              <div>
                <label className="label" htmlFor="new-account-id">
                  Identifiant (e-mail ou numéro)
                </label>
                <input id="new-account-id" name="identifier" className="input" required maxLength={200} />
              </div>
            </div>
            <div className="mt-4">
              <SubmitButton variant="secondary">Créer le compte et afficher les accès</SubmitButton>
            </div>
          </ActionForm>
        </details>

        <details className="card">
          <summary className="cursor-pointer font-semibold">Abonnement et paiements</summary>
          <ActionForm action={updateSubscriptionAction.bind(null, tenant.id)} className="mt-4">
            <h3 className="card-title">Abonnement</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="label" htmlFor="sub-status">
                  Statut
                </label>
                <select id="sub-status" name="status" className="input" defaultValue={sub?.status === "active" ? "active" : "trial"}>
                  <option value="trial">Essai</option>
                  <option value="active">Actif</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="sub-start">
                  Début
                </label>
                <input id="sub-start" name="startsAt" type="date" className="input" defaultValue={dateInputValue(sub?.startsAt)} />
              </div>
              <div>
                <label className="label" htmlFor="sub-end">
                  Fin (vide = sans fin)
                </label>
                <input id="sub-end" name="endsAt" type="date" className="input" defaultValue={dateInputValue(sub?.endsAt)} />
              </div>
            </div>
            <div className="mt-4">
              <SubmitButton variant="secondary">Enregistrer l&apos;abonnement</SubmitButton>
            </div>
          </ActionForm>

          <ActionForm action={declarePaymentAction} className="mt-6 border-t border-slate-200 pt-4">
            <input type="hidden" name="tenantId" value={tenant.id} />
            <h3 className="card-title">Déclarer un paiement reçu</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="pay-amount">
                  Montant (FBu)
                </label>
                <input id="pay-amount" name="amount" className="input" required placeholder="10000" />
              </div>
              <div>
                <label className="label" htmlFor="pay-method">
                  Mode
                </label>
                <select id="pay-method" name="method" className="input">
                  {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="pay-ref">
                  Référence (facultative)
                </label>
                <input id="pay-ref" name="reference" className="input" maxLength={100} />
              </div>
              <div>
                <label className="label" htmlFor="pay-date">
                  Date du paiement
                </label>
                <input id="pay-date" name="paidAt" type="date" className="input" defaultValue={dateInputValue(new Date())} />
              </div>
              <div className="md:col-span-2">
                <label className="label" htmlFor="pay-note">
                  Note
                </label>
                <input id="pay-note" name="note" className="input" maxLength={500} />
              </div>
            </div>
            <div className="mt-4">
              <SubmitButton variant="secondary">Déclarer le paiement</SubmitButton>
            </div>
          </ActionForm>

          <h3 className="card-title mt-6">Historique des paiements</h3>
          {paymentList.length === 0 ? (
            <Empty>Aucun paiement enregistré.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Montant</th>
                    <th>Mode</th>
                    <th>Référence</th>
                    <th>Statut</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentList.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.paidAt ?? payment.createdAt)}</td>
                      <td>{formatBif(payment.amountBif)}</td>
                      <td>{PAYMENT_METHODS[payment.method as keyof typeof PAYMENT_METHODS] ?? payment.method}</td>
                      <td className="font-mono text-xs">{payment.reference ?? "—"}</td>
                      <td>{payment.status}</td>
                      <td className="text-xs text-slate-600">{payment.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </details>

        <details className="card">
          <summary className="cursor-pointer font-semibold">Certificats HTTPS</summary>
          <ul className="mt-4 space-y-2">
            {certificates.map((certificate) => (
              <li key={certificate.host} className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-mono">{certificate.host}</span>
                <CertificateBadge status={certificate.status} known={certificate.known} />
                {certificate.expiresAt ? <span className="text-slate-500">expire le {formatDate(certificate.expiresAt)}</span> : null}
                {certificate.error ? <span className="text-red-700">{certificate.error}</span> : null}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <form action={requestCertificateAction.bind(null, tenant.id, false)}>
              <SubmitButton variant="secondary" className="btn-sm">
                Demander le certificat
              </SubmitButton>
            </form>
            <form action={requestCertificateAction.bind(null, tenant.id, true)}>
              <SubmitButton variant="secondary" className="btn-sm">
                Demander aussi staging-
              </SubmitButton>
            </form>
          </div>
          <p className="hint">La demande écrit un fichier que le travail cron de l&apos;hôte traitera ; le statut s&apos;affiche ici une fois le certificat émis.</p>
        </details>
      </div>
    </main>
  );
}
