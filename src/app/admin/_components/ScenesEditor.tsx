import { ActionForm, SubmitButton } from "./ActionForm";
import { updateScenesAction } from "../_actions/vendors";
import { formatBox, POSE_NAMES } from "@/lib/admin/scenes";
import { LOCALE_LABELS } from "@/lib/admin/validation";
import { MAX_SCENES, MIN_SCENES, type Tenant, type TenantScene } from "@/lib/tenant/types";

const TEXTS: { name: "label" | "title" | "text" | "alt"; label: string; multiline?: boolean }[] = [
  { name: "label", label: "Libellé (bandeau, progression)" },
  { name: "title", label: "Titre" },
  { name: "text", label: "Texte", multiline: true },
  { name: "alt", label: "Description de la photo (accessibilité)" },
];

function IntentButton({ intent, children, disabled }: { intent: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="submit" name="intent" value={intent} disabled={disabled} className="btn border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 hover:bg-slate-50 disabled:opacity-40">
      {children}
    </button>
  );
}

function SceneFields({ scene, index, count, locales }: { scene: TenantScene; index: number; count: number; locales: Tenant["locales"] }) {
  const p = `scene.${index}`;
  const f = scene.framing;
  return (
    <fieldset className="mt-4 rounded-lg border border-slate-200 p-4">
      <legend className="px-1 font-semibold">
        Scène {index + 1} — <span className="font-mono text-sm">{scene.id}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        <IntentButton intent={`up:${index}`} disabled={index === 0}>
          ↑ Monter
        </IntentButton>
        <IntentButton intent={`down:${index}`} disabled={index === count - 1}>
          ↓ Descendre
        </IntentButton>
        <IntentButton intent={`remove:${index}`}>Supprimer</IntentButton>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div>
          <label className="label" htmlFor={`${p}.id`}>
            Identifiant
          </label>
          <input id={`${p}.id`} name={`${p}.id`} className="input font-mono" defaultValue={scene.id} pattern="[a-z0-9][a-z0-9-]*" required />
        </div>
        <div>
          <label className="label" htmlFor={`${p}.pose`}>
            Composition 3D
          </label>
          <select id={`${p}.pose`} name={`${p}.pose`} className="input" defaultValue={scene.pose ?? ""}>
            <option value="">Automatique (selon la position)</option>
            {POSE_NAMES.map((pose) => (
              <option key={pose} value={pose}>
                {pose}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${p}.aspect`}>
            Rapport largeur/hauteur (paysage)
          </label>
          <input id={`${p}.aspect`} name={`${p}.aspect`} className="input" inputMode="decimal" placeholder="1.778 (16:9)" defaultValue={scene.aspect ?? ""} />
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div>
          <label className="label" htmlFor={`${p}.landscape`}>
            Photo paysage 16:9 (personnes d’un seul côté)
          </label>
          <input id={`${p}.landscape`} name={`${p}.landscape`} className="input font-mono text-xs" defaultValue={scene.image.landscape} />
          <input name={`sceneFile.${index}.landscape`} type="file" accept="image/*" className="input mt-1 text-xs" aria-label={`Scène ${index + 1} : téléverser la photo paysage`} />
        </div>
        <div>
          <label className="label" htmlFor={`${p}.portrait`}>
            Photo portrait 9:16 (facultatif)
          </label>
          <input id={`${p}.portrait`} name={`${p}.portrait`} className="input font-mono text-xs" defaultValue={scene.image.portrait ?? ""} />
          <input name={`sceneFile.${index}.portrait`} type="file" accept="image/*" className="input mt-1 text-xs" aria-label={`Scène ${index + 1} : téléverser la photo portrait`} />
        </div>
        <div>
          <label className="label" htmlFor={`${p}.fallback`}>
            Visuel provisoire (tant que la photo manque)
          </label>
          <input id={`${p}.fallback`} name={`${p}.fallback`} className="input font-mono text-xs" defaultValue={scene.image.fallback ?? ""} />
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {TEXTS.map((t) => (
          <div key={t.name}>
            <label className="label" htmlFor={`${p}.${t.name}.fr`}>
              {t.label}
            </label>
            {locales.map((locale) =>
              t.multiline ? (
                <textarea
                  key={locale}
                  id={`${p}.${t.name}.${locale}`}
                  name={`${p}.${t.name}.${locale}`}
                  className="input mt-1"
                  rows={2}
                  placeholder={LOCALE_LABELS[locale]}
                  defaultValue={scene[t.name][locale] ?? ""}
                />
              ) : (
                <input
                  key={locale}
                  id={`${p}.${t.name}.${locale}`}
                  name={`${p}.${t.name}.${locale}`}
                  className="input mt-1"
                  placeholder={LOCALE_LABELS[locale]}
                  defaultValue={scene[t.name][locale] ?? ""}
                />
              ),
            )}
          </div>
        ))}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold">Cadrage (en % de la photo paysage)</summary>
        <div className="mt-2 grid gap-3 md:grid-cols-4">
          <div>
            <label className="label" htmlFor={`${p}.desktop`}>
              Grand écran
            </label>
            <select id={`${p}.desktop`} name={`${p}.desktop`} className="input" defaultValue={f.desktop ?? "full"}>
              <option value="full">Plein cadre (côté libre)</option>
              <option value="card">Carte (photo chargée)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor={`${p}.freeSide`}>
              Côté libre
            </label>
            <select id={`${p}.freeSide`} name={`${p}.freeSide`} className="input" defaultValue={f.freeSide}>
              <option value="right">Droite</option>
              <option value="left">Gauche</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor={`${p}.wide`}>
              Position (object-position)
            </label>
            <input id={`${p}.wide`} name={`${p}.wide`} className="input font-mono" defaultValue={f.wide} />
          </div>
          <div>
            <label className="label" htmlFor={`${p}.copyWidth`}>
              Largeur du texte (vw)
            </label>
            <input id={`${p}.copyWidth`} name={`${p}.copyWidth`} type="number" min={8} max={60} className="input" defaultValue={f.copy.width} />
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor={`${p}.faces`}>
              Visages à garder visibles (une ligne x0,y0,x1,y1 par visage)
            </label>
            <textarea id={`${p}.faces`} name={`${p}.faces`} className="input font-mono text-xs" rows={3} defaultValue={f.faces.map(formatBox).join("\n")} />
          </div>
          <div>
            <label className="label" htmlFor={`${p}.sachet`}>
              Produit dans la photo (x0,y0,x1,y1)
            </label>
            <input id={`${p}.sachet`} name={`${p}.sachet`} className="input font-mono" defaultValue={formatBox(f.sachet)} />
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                ["anchorCx", "3D cx (vw)", f.anchor.cx],
                ["anchorCy", "3D cy (svh)", f.anchor.cy],
                ["anchorSize", "Taille (svh)", f.anchor.size],
              ] as const
            ).map(([name, label, value]) => (
              <div key={name}>
                <label className="label text-xs" htmlFor={`${p}.${name}`}>
                  {label}
                </label>
                <input id={`${p}.${name}`} name={`${p}.${name}`} type="number" min={0} max={100} step="any" className="input" defaultValue={value} />
              </div>
            ))}
          </div>
        </div>
      </details>
    </fieldset>
  );
}

/** Ordered life-moment scenes of the home page (photos, texts per language, framing, 3D composition). */
export function ScenesEditor({ tenant }: { tenant: Tenant }) {
  const scenes = tenant.scenes;
  const builtIn = tenant.template === "krumbz" && scenes.length === 0;
  return (
    <ActionForm action={updateScenesAction.bind(null, tenant.id)} className="mt-4">
      <input type="hidden" name="sceneCount" value={scenes.length} />
      {/* Default button (Enter in a field = save, not « move up »). */}
      <button type="submit" name="intent" value="save" className="sr-only" tabIndex={-1} aria-hidden>
        Enregistrer
      </button>
      <p className="hint">
        {builtIn
          ? "Krumbz utilise ses 17 scènes intégrées (images et cadrages du dépôt). Ajouter des scènes ici les remplace toutes."
          : `Entre ${MIN_SCENES} et ${MAX_SCENES} scènes. Photo paysage : personnes et produit d’un seul côté, l’autre côté reste calme (texte et produit 3D). Photo portrait : sujet dans les deux tiers supérieurs, tiers inférieur calme.`}
      </p>
      {scenes.map((scene, index) => (
        <SceneFields key={`${scene.id}-${index}`} scene={scene} index={index} count={scenes.length} locales={tenant.locales} />
      ))}
      <div className="mt-4 flex flex-wrap gap-2">
        <SubmitButton>Enregistrer les scènes</SubmitButton>
        <IntentButton intent="add" disabled={scenes.length >= MAX_SCENES}>
          + Ajouter une scène
        </IntentButton>
      </div>
    </ActionForm>
  );
}
