import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "../../_components/ActionForm";
import { Empty, PageHeader, TenantStatusBadge } from "../../_components/ui";
import { createVendorAction } from "../../_actions/vendors";
import { BODY_FONTS, DEFAULT_THEME, DISPLAY_FONTS, RADIUS_OPTIONS } from "@/lib/admin/theme";
import { listVendors } from "@/lib/admin/vendors";
import { FEATURE_KEYS } from "@/lib/db/mappers";
import { getDb } from "@/lib/db/client";
import { getOfferSettings } from "@/lib/platform/settings";
import { LOCALE_LABELS } from "@/lib/admin/validation";
import { PLATFORM_LOCALES } from "@/lib/tenant/types";
import { currentAdmin, formatDate } from "../../_lib/server";

export const metadata: Metadata = { title: "Vendeurs" };

const FEATURE_LABELS: Record<string, string> = {
  threeD: "Modèles 3D",
  advancedAnimations: "Animations avancées",
  languages: "Langues supplémentaires",
  stats: "Statistiques",
};

/** Vendor list + guided creation wizard (creates the shop, its account and its credentials). */
export default async function VendorsPage() {
  await currentAdmin();
  const db = getDb();
  const [vendors, offer] = await Promise.all([listVendors(db), getOfferSettings(db)]);

  return (
    <main>
      <PageHeader title="Vendeurs" description="Boutiques, accès et abonnements de la plateforme." />

      <section className="card mb-6" aria-labelledby="nouvelle-boutique">
        <h2 id="nouvelle-boutique" className="card-title">
          Créer une boutique
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          La boutique est créée sur le modèle unique (le même parcours que Krumbz : seuls couleurs, images, nom, textes et produits changent), avec 5 scènes et des textes de départ à remplacer, un essai de {offer.trialDays} jours, un compte vendeur et un mot de passe provisoire à transmettre par WhatsApp.
        </p>
        <ActionForm action={createVendorAction}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">
                Nom de la boutique *
              </label>
              <input id="name" name="name" className="input" required maxLength={120} placeholder="Chaussures Ikirenge" />
            </div>
            <div>
              <label className="label" htmlFor="slug">
                Sous-domaine *
              </label>
              <input id="slug" name="slug" className="input" required maxLength={40} placeholder="ikirenge" />
              <p className="hint">3 à 32 caractères, minuscules et tirets. La boutique sera sur https://ikirenge.rundinova.com.</p>
            </div>
            <div>
              <label className="label" htmlFor="ownerName">
                Nom du vendeur
              </label>
              <input id="ownerName" name="ownerName" className="input" maxLength={80} placeholder="Nom affiché dans l'espace vendeur" />
            </div>
            <div>
              <label className="label" htmlFor="identifier">
                Identifiant de connexion *
              </label>
              <input id="identifier" name="identifier" className="input" required maxLength={200} placeholder="vendeur@exemple.com ou 25768497372" />
            </div>
            <div>
              <label className="label" htmlFor="whatsapp">
                WhatsApp de la boutique *
              </label>
              <input id="whatsapp" name="whatsapp" className="input" required maxLength={30} placeholder="25768497372" />
              <p className="hint">Numéro avec indicatif, utilisé pour recevoir les commandes et les accès.</p>
            </div>
            <div>
              <label className="label" htmlFor="email">
                E-mail de contact
              </label>
              <input id="email" name="email" type="email" className="input" maxLength={200} />
            </div>
            <div>
              <label className="label" htmlFor="city">
                Ville
              </label>
              <input id="city" name="city" className="input" maxLength={80} />
            </div>
            <div>
              <label className="label" htmlFor="address">
                Adresse
              </label>
              <input id="address" name="address" className="input" maxLength={200} />
            </div>
          </div>

          <fieldset className="mt-4 rounded-lg border border-slate-200 p-4">
            <legend className="label px-1">Identité visuelle (facultatif, modifiable ensuite)</legend>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="label" htmlFor="new-color-primary">
                  Couleur principale
                </label>
                <input id="new-color-primary" name="color.primary" type="color" className="input h-11" defaultValue={DEFAULT_THEME.colors.primary} />
              </div>
              <div>
                <label className="label" htmlFor="new-color-accent">
                  Couleur d&apos;accent
                </label>
                <input id="new-color-accent" name="color.accent" type="color" className="input h-11" defaultValue={DEFAULT_THEME.colors.accent} />
              </div>
              <div>
                <label className="label" htmlFor="new-color-background">
                  Fond des pages
                </label>
                <input id="new-color-background" name="color.background" type="color" className="input h-11" defaultValue={DEFAULT_THEME.colors.background} />
              </div>
              <div>
                <label className="label" htmlFor="new-font-display">
                  Police des titres
                </label>
                <select id="new-font-display" name="fontDisplay" className="input" defaultValue={DEFAULT_THEME.fonts.display}>
                  {DISPLAY_FONTS.map((font) => (
                    <option key={font}>{font}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="new-font-body">
                  Police du texte
                </label>
                <select id="new-font-body" name="fontBody" className="input" defaultValue={DEFAULT_THEME.fonts.body}>
                  {BODY_FONTS.map((font) => (
                    <option key={font}>{font}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="new-logo">
                  Logo (PNG, SVG ou JPG)
                </label>
                <input id="new-logo" name="logo" type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp,image/avif,.svg" className="input" />
                <p className="hint">Transparence conservée ; favicon et image de partage générés automatiquement.</p>
              </div>
            </div>
          </fieldset>

          <fieldset className="mt-4">
            <legend className="label">Langues de la boutique</legend>
            <div className="flex flex-wrap gap-4">
              {PLATFORM_LOCALES.map((locale, index) => (
                <label key={locale} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="locales" value={locale} defaultChecked={index === 0} /> {LOCALE_LABELS[locale]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-4">
            <legend className="label">Fonctionnalités</legend>
            <div className="flex flex-wrap gap-4">
              {FEATURE_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name={`feature.${key}`} defaultChecked={key === "threeD" || key === "languages"} /> {FEATURE_LABELS[key]}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" name="staging" /> Demander aussi un certificat pour la préproduction (staging-&lt;slug&gt;)
          </label>

          <div className="mt-4">
            <SubmitButton>Créer la boutique et afficher les accès</SubmitButton>
          </div>
        </ActionForm>
      </section>

      <section className="card" aria-labelledby="liste-vendeurs">
        <h2 id="liste-vendeurs" className="card-title">
          Boutiques existantes ({vendors.length})
        </h2>
        {vendors.length === 0 ? (
          <Empty>Aucune boutique. Créez la première avec le formulaire ci-dessus.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Boutique</th>
                  <th>Adresse</th>
                  <th>Statut</th>
                  <th>Abonnement</th>
                  <th>Comptes</th>
                  <th>Créée le</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td>
                      <Link className="link font-medium" href={`/vendeurs/${vendor.id}`}>
                        {vendor.name}
                      </Link>
                      {vendor.pendingPayments > 0 ? <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">{vendor.pendingPayments} à valider</span> : null}
                    </td>
                    <td className="font-mono text-xs">{vendor.slug}</td>
                    <td>
                      <TenantStatusBadge status={vendor.status} />
                    </td>
                    <td>
                      {vendor.subscriptionStatus ?? "—"}
                      {vendor.subscriptionEndsAt ? <span className="block text-xs text-slate-500">jusqu&apos;au {formatDate(vendor.subscriptionEndsAt)}</span> : null}
                    </td>
                    <td>{vendor.accounts}</td>
                    <td>{formatDate(vendor.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-4 text-xs text-slate-500">
        Thème par défaut : {DEFAULT_THEME.fonts.display} / {DEFAULT_THEME.fonts.body}, coins {RADIUS_OPTIONS.find((r) => r.value === DEFAULT_THEME.radius)?.label.toLowerCase()}. Personnalisable sur chaque fiche vendeur.
      </p>
    </main>
  );
}
