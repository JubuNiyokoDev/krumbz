import { ActionForm, SubmitButton } from "./ActionForm";
import { updateThemeAction } from "../_actions/vendors";
import { BODY_FONTS, COLOR_FIELDS, DISPLAY_FONTS, PALETTE_FIELDS, RADIUS_OPTIONS } from "@/lib/admin/theme";
import { resolvePalette } from "@/lib/storefront/theme";
import type { Tenant } from "@/lib/tenant/types";

/** Colours (base + storefront tokens), fonts, radius, logo and icon of a shop. */
export function ThemeEditor({ tenant }: { tenant: Tenant }) {
  const { theme } = tenant;
  const derived = resolvePalette({ colors: theme.colors });
  return (
    <ActionForm action={updateThemeAction.bind(null, tenant.id)} className="mt-4">
      <h3 className="font-semibold">Couleurs de base</h3>
      <div className="mt-2 grid gap-4 md:grid-cols-3">
        {COLOR_FIELDS.map((field) => (
          <div key={field.key}>
            <label className="label" htmlFor={`color-${field.key}`}>
              {field.label}
            </label>
            <input id={`color-${field.key}`} name={`color.${field.key}`} type="color" className="input h-11" defaultValue={theme.colors[field.key]} />
          </div>
        ))}
      </div>

      <h3 className="mt-6 font-semibold">Palette de la boutique (facultatif)</h3>
      <p className="hint">
        Les jetons du modèle (mêmes rôles que Krumbz). Laisser vide pour la valeur calculée à partir des couleurs de base (indiquée entre
        parenthèses, après enregistrement). Format #rrggbb.
      </p>
      <div className="mt-2 grid gap-4 md:grid-cols-3">
        {PALETTE_FIELDS.map((field) => (
          <div key={field.key}>
            <label className="label" htmlFor={`palette-${field.key}`}>
              {field.label}
            </label>
            <div className="flex items-center gap-2">
              <span aria-hidden className="h-9 w-9 shrink-0 rounded border border-slate-300" style={{ background: theme.palette?.[field.key] ?? derived[field.key] }} />
              <input
                id={`palette-${field.key}`}
                name={`palette.${field.key}`}
                className="input font-mono"
                pattern="#[0-9a-fA-F]{6}"
                placeholder={`(${derived[field.key]})`}
                defaultValue={theme.palette?.[field.key] ?? ""}
              />
            </div>
          </div>
        ))}
      </div>

      <h3 className="mt-6 font-semibold">Typographie, formes et images</h3>
      <div className="mt-2 grid gap-4 md:grid-cols-3">
        <div>
          <label className="label" htmlFor="fontDisplay">
            Police des titres
          </label>
          <select id="fontDisplay" name="fontDisplay" className="input" defaultValue={theme.fonts.display}>
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
          <select id="fontBody" name="fontBody" className="input" defaultValue={theme.fonts.body}>
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
          <select id="radius" name="radius" className="input" defaultValue={theme.radius}>
            {RADIUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="logo">
            Logo (PNG, SVG ou JPG, 8 Mo maximum) — en-tête, chargement 3D, transition, pied de page, page 404
          </label>
          <input id="logo" name="logo" type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp,image/avif,.svg" className="input" />
          <p className="hint">Transparence conservée (PNG/WebP avec alpha, SVG nettoyé). Sans logo : le nom de la boutique dans le style du modèle.</p>
          {theme.logoUrl ? (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an upload */}
              <img
                src={theme.logoUrl}
                alt="Logo actuel"
                data-testid="admin-logo-preview"
                className="h-12 w-auto max-w-[12rem] rounded bg-[repeating-conic-gradient(#e2e8f0_0_25%,#fff_0_50%)] bg-[length:12px_12px] object-contain p-1"
              />
              <label className="inline-flex items-center gap-1">
                <input type="checkbox" name="removeLogo" /> retirer le logo
              </label>
            </div>
          ) : null}
        </div>
        <div>
          <label className="label" htmlFor="icon">
            Favicon (facultatif, carré) — sinon généré à partir du logo
          </label>
          <input id="icon" name="icon" type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp,image/avif,.svg" className="input" />
          {theme.brand ? (
            <div className="mt-2 flex items-end gap-2 text-xs text-slate-500">
              {[theme.brand.icon32, theme.brand.icon180, theme.brand.icon512].map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- admin preview of the generated icons
                <img key={src} src={src} alt="" className={["h-6 w-6", "h-10 w-10 rounded-lg", "h-14 w-14 rounded-xl"][i]} />
              ))}
              {theme.iconUrl ? (
                <label className="ml-2 inline-flex items-center gap-1">
                  <input type="checkbox" name="removeIcon" /> retirer le favicon
                </label>
              ) : (
                <span>(générés à partir du logo)</span>
              )}
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-4">
        <SubmitButton>Enregistrer le thème</SubmitButton>
      </div>
    </ActionForm>
  );
}
