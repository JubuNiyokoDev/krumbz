import { ActionForm, SubmitButton } from "./ActionForm";
import { updateContentAction } from "../_actions/vendors";
import { CONTENT_FIELDS, localeText, MEDIA_FIELDS } from "@/lib/admin/content";
import { LOCALE_LABELS } from "@/lib/admin/validation";
import type { Tenant, TenantMedia } from "@/lib/tenant/types";

/**
 * Shop texts in the template's schema (keys of content/site.fr.json, one object per language):
 * guided fields for the main texts, section images, and the full JSON editor.
 */
export function ContentEditor({ tenant }: { tenant: Tenant }) {
  const content = tenant.content;
  const media = (content.media ?? {}) as TenantMedia;
  const bespoke = tenant.template === "krumbz";
  return (
    <>
      <p className="hint mt-3">
        {bespoke
          ? "Krumbz : les textes viennent de content/site.*.json (dépôt). Dans le JSON ci-dessous, une clé de langue remplace une rubrique entière (clé de premier niveau) : à manier avec précaution."
          : "Mêmes rubriques que Krumbz. Une rubrique absente est masquée sur la boutique ; une traduction absente reprend le français. Les autres textes (moments, atouts, histoire, mentions légales…) se modifient dans l’éditeur JSON ci-dessous."}
      </p>
      {bespoke ? null : (
      <ActionForm action={updateContentAction.bind(null, tenant.id)} className="mt-4">
        <div className="grid gap-4 md:grid-cols-2">
          {CONTENT_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="label" htmlFor={`content-fr-${field.key}`}>
                {field.label} <span className="font-mono text-xs text-slate-400">{field.key}</span>
              </label>
              {tenant.locales.map((locale) =>
                field.multiline ? (
                  <textarea
                    key={locale}
                    id={`content-${locale}-${field.key}`}
                    name={`content.${locale}.${field.key}`}
                    className="input mt-1"
                    rows={3}
                    maxLength={field.max}
                    placeholder={locale === "fr" ? "Français (vide = rubrique masquée)" : `${LOCALE_LABELS[locale]} (vide = français)`}
                    defaultValue={localeText(content, locale, field.key)}
                  />
                ) : (
                  <input
                    key={locale}
                    id={`content-${locale}-${field.key}`}
                    name={`content.${locale}.${field.key}`}
                    className="input mt-1"
                    maxLength={field.max}
                    placeholder={locale === "fr" ? "Français (vide = rubrique masquée)" : `${LOCALE_LABELS[locale]} (vide = français)`}
                    defaultValue={localeText(content, locale, field.key)}
                  />
                ),
              )}
            </div>
          ))}
        </div>
        <div className="mt-4">
          <SubmitButton>Enregistrer les textes</SubmitButton>
        </div>
      </ActionForm>
      )}

      {bespoke ? null : (
      <ActionForm action={updateContentAction.bind(null, tenant.id)} className="mt-6 border-t border-slate-200 pt-4" label="Images des rubriques">
        <input type="hidden" name="mediaForm" value="1" />
        <h3 className="font-semibold">Images des rubriques</h3>
        <p className="hint">Chemin public (/images/tenants/{tenant.slug}/…) ou fichier à téléverser. Listes : un chemin par ligne, dans l’ordre des éléments.</p>
        <div className="mt-2 grid gap-4 md:grid-cols-2">
          {MEDIA_FIELDS.map((field) => {
            const value = media[field.key];
            return (
              <div key={field.key}>
                <label className="label" htmlFor={`media-${field.key}`}>
                  {field.label}
                </label>
                {field.list ? (
                  <>
                    <textarea
                      id={`media-${field.key}`}
                      name={`media.${field.key}`}
                      className="input font-mono text-xs"
                      rows={3}
                      defaultValue={Array.isArray(value) ? value.join("\n") : ""}
                    />
                    <div className="mt-1 grid grid-cols-3 gap-1">
                      {[0, 1, 2].map((i) => (
                        <input key={i} name={`mediaFile.${field.key}.${i}`} type="file" accept="image/*" className="input text-xs" aria-label={`${field.label} — image ${i + 1}`} />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <input id={`media-${field.key}`} name={`media.${field.key}`} className="input font-mono text-xs" defaultValue={typeof value === "string" ? value : ""} />
                    <input name={`mediaFile.${field.key}`} type="file" accept="image/*" className="input mt-1 text-xs" aria-label={`${field.label} — téléverser`} />
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <SubmitButton variant="secondary">Enregistrer les images</SubmitButton>
        </div>
      </ActionForm>
      )}

      <ActionForm action={updateContentAction.bind(null, tenant.id)} className="mt-6 border-t border-slate-200 pt-4">
        <label className="label" htmlFor="content-json">
          Contenu complet (JSON) — {"{ fr: { … }, en: { … }, rn: { … }, sw: { … }, media: { … }, gallery: { … } }"}
        </label>
        <textarea id="content-json" name="contentJson" className="input font-mono text-xs" rows={18} defaultValue={JSON.stringify(content, null, 2)} />
        <p className="hint">Remplace tout le contenu. Clés de chaque langue : celles de content/site.fr.json (home, products, story, legal, seo…). 256 Ko maximum.</p>
        <div className="mt-3">
          <SubmitButton variant="secondary">Remplacer le contenu (JSON)</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
