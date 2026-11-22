import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "../../_components/ActionForm";
import { PageHeader } from "../../_components/ui";
import { saveOfferAction, saveStudioAction } from "../../_actions/billing";
import { currentAdmin } from "../../_lib/server";
import { getDb } from "@/lib/db/client";
import { LOCALE_LABELS } from "@/lib/admin/validation";
import { getOfferSettings, getStudioSettings, OFFER_KEY, STUDIO_KEY } from "@/lib/platform/settings";
import { PLATFORM_LOCALES } from "@/lib/tenant/types";

export const metadata: Metadata = { title: "Réglages" };

/** Platform-wide offer, prices and Rundinova contact details (decision D4). */
export default async function SettingsPage() {
  await currentAdmin();
  const db = getDb();
  const [offer, studio] = await Promise.all([getOfferSettings(db), getStudioSettings(db)]);

  return (
    <main>
      <PageHeader
        title="Réglages"
        description="Offre, tarifs et coordonnées affichés sur le site Rundinova Studio et utilisés pour la facturation."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card" aria-labelledby="offre">
          <h2 id="offre" className="card-title">
            Offre et tarifs
          </h2>
          <ActionForm action={saveOfferAction}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="launch-price">
                  Pack de lancement (FBu)
                </label>
                <input id="launch-price" name="launchPriceBif" className="input" type="number" min={0} max={100000000} defaultValue={offer.launchPriceBif} required />
              </div>
              <div>
                <label className="label" htmlFor="monthly-price">
                  Mensualité (FBu)
                </label>
                <input id="monthly-price" name="monthlyPriceBif" className="input" type="number" min={1} max={100000000} defaultValue={offer.monthlyPriceBif} required />
              </div>
              <div>
                <label className="label" htmlFor="launch-months">
                  Mois inclus dans le pack
                </label>
                <input id="launch-months" name="launchIncludedMonths" className="input" type="number" min={0} max={24} defaultValue={offer.launchIncludedMonths} required />
              </div>
              <div>
                <label className="label" htmlFor="trial-days">
                  Durée de l&apos;essai (jours)
                </label>
                <input id="trial-days" name="trialDays" className="input" type="number" min={0} max={365} defaultValue={offer.trialDays} required />
              </div>
            </div>

            <h3 className="card-title mt-6">Textes de l&apos;offre</h3>
            {(
              [
                ["headline", "Titre", 200],
                ["launch", "Pack de lancement", 300],
                ["monthly", "Abonnement mensuel", 200],
                ["note", "Note sur le paiement", 400],
              ] as const
            ).map(([key, label, max]) => (
              <fieldset key={key} className="mt-3">
                <legend className="label">{label}</legend>
                {PLATFORM_LOCALES.map((locale) => (
                  <div key={locale} className="mt-1">
                    <label className="mb-0.5 block text-xs text-slate-500" htmlFor={`offer-${key}-${locale}`}>
                      {LOCALE_LABELS[locale]}
                      {locale === "fr" ? " (obligatoire)" : ""}
                    </label>
                    <input
                      id={`offer-${key}-${locale}`}
                      name={`${key}.${locale}`}
                      className="input"
                      maxLength={max}
                      defaultValue={offer.texts[key][locale] ?? ""}
                      required={locale === "fr"}
                    />
                  </div>
                ))}
              </fieldset>
            ))}

            <div className="mt-5">
              <SubmitButton>Enregistrer l&apos;offre</SubmitButton>
            </div>
          </ActionForm>
          <p className="hint">Clé : <span className="font-mono">{OFFER_KEY}</span>. Les textes vides dans une langue replient sur le français.</p>
        </section>

        <section className="card" aria-labelledby="coordonnees">
          <h2 id="coordonnees" className="card-title">
            Coordonnées Rundinova
          </h2>
          {studio.whatsappPlaceholder || studio.lumicash.placeholder || studio.ecocash.placeholder ? (
            <p role="status" className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Numéros provisoires en attente de décision (D4). Remplacez-les avant la mise en ligne ; le lien WhatsApp est prérempli pour les vendeurs et les clients.
            </p>
          ) : null}
          <ActionForm action={saveStudioAction}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="studio-whatsapp">
                  WhatsApp Rundinova (avec indicatif)
                </label>
                <input id="studio-whatsapp" name="whatsapp" className="input" inputMode="numeric" defaultValue={studio.whatsapp} required />
              </div>
              <div>
                <label className="label" htmlFor="lumicash">
                  Numéro Lumicash
                </label>
                <input id="lumicash" name="lumicash" className="input" inputMode="numeric" defaultValue={studio.lumicash.number} />
              </div>
              <div>
                <label className="label" htmlFor="lumicash-name">
                  Nom du compte Lumicash
                </label>
                <input id="lumicash-name" name="lumicashName" className="input" maxLength={80} defaultValue={studio.lumicash.name} />
              </div>
              <div>
                <label className="label" htmlFor="ecocash">
                  Numéro EcoCash
                </label>
                <input id="ecocash" name="ecocash" className="input" inputMode="numeric" defaultValue={studio.ecocash.number} />
              </div>
              <div>
                <label className="label" htmlFor="ecocash-name">
                  Nom du compte EcoCash
                </label>
                <input id="ecocash-name" name="ecocashName" className="input" maxLength={80} defaultValue={studio.ecocash.name} />
              </div>
            </div>
            <div className="mt-5">
              <SubmitButton>Enregistrer les coordonnées</SubmitButton>
            </div>
          </ActionForm>
          <p className="hint">Clé : <span className="font-mono">{STUDIO_KEY}</span>. La modification est répercutée sur le site marketing après revalidation du cache.</p>
        </section>
      </div>
    </main>
  );
}
