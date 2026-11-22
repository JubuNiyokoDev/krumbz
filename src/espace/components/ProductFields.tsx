import type { Localized, PlatformLocale, Product } from "@/lib/tenant/types";
import { LIMITS } from "@/lib/espace/validation";
import { format, type EspaceMessages } from "../i18n";

const get = (value: Localized | null | undefined, locale: PlatformLocale) => (value as Record<string, string | undefined> | null | undefined)?.[locale] ?? "";

/**
 * Fields of the product form (create + edit). French is required; the other
 * languages of the shop are optional and collapsed. Field names are read by
 * parseProductForm() (src/lib/espace/validation.ts).
 */
export function ProductFields({
  m,
  locales,
  product,
  withPhotos = false,
}: {
  m: EspaceMessages;
  locales: PlatformLocale[];
  product?: Product | null;
  withPhotos?: boolean;
}) {
  const others = locales.filter((locale) => locale !== "fr");
  const factSlots = Math.min(LIMITS.facts, Math.max(2, (product?.facts.length ?? 0) + 2));
  const facts = Array.from({ length: factSlots }, (_, index) => product?.facts[index]);
  const localeName = (locale: PlatformLocale) => m.locales[locale];

  return (
    <>
      <section className="card">
        <h2>{m.product.texts}</h2>
        <label className="field">
          <span>
            {m.product.name} <span className="muted">({m.common.required})</span>
          </span>
          <input name="name.fr" type="text" required maxLength={LIMITS.name} defaultValue={get(product?.name, "fr")} />
        </label>
        <label className="field">
          <span>{m.product.short}</span>
          <input name="short.fr" type="text" maxLength={LIMITS.short} defaultValue={get(product?.short, "fr")} />
          <small>{m.product.shortHint}</small>
        </label>
        <label className="field">
          <span>{m.product.description}</span>
          <textarea name="description.fr" rows={4} maxLength={LIMITS.description} defaultValue={get(product?.description, "fr")} />
        </label>
      </section>

      <section className="card">
        <h2>{m.product.priceSection}</h2>
        <div className="pair">
          <label className="field">
            <span>{m.product.price}</span>
            <input name="price" type="text" inputMode="numeric" autoComplete="off" maxLength={16} defaultValue={product?.price ?? ""} />
            <small>{m.product.priceHint}</small>
          </label>
          <label className="field">
            <span>{m.product.compareAtPrice}</span>
            <input name="compareAtPrice" type="text" inputMode="numeric" autoComplete="off" maxLength={16} defaultValue={product?.compareAtPrice ?? ""} />
            <small>{m.product.compareAtPriceHint}</small>
          </label>
        </div>
        <label className="field">
          <span>{m.product.promoLabel}</span>
          <input name="promoLabel.fr" type="text" maxLength={LIMITS.promoLabel} defaultValue={get(product?.promoLabel, "fr")} />
          <small>{m.product.promoLabelHint}</small>
        </label>
      </section>

      <section className="card">
        <h2>{m.product.facts}</h2>
        <p className="hint">{m.product.factsHint}</p>
        {facts.map((fact, index) => (
          <div className="pair" key={index}>
            <label className="field">
              <span>{format(m.product.factLabel, { n: index + 1 })}</span>
              <input name={`facts.${index}.label.fr`} type="text" maxLength={LIMITS.factLabel} defaultValue={get(fact?.label, "fr")} />
            </label>
            <label className="field">
              <span>{format(m.product.factValue, { n: index + 1 })}</span>
              <input name={`facts.${index}.value.fr`} type="text" maxLength={LIMITS.factValue} defaultValue={get(fact?.value, "fr")} />
            </label>
          </div>
        ))}
      </section>

      {others.length ? (
        <section className="card">
          <h2>{m.common.otherLanguages}</h2>
          {others.map((locale) => (
            <details className="locale" key={locale} lang={locale}>
              <summary>{localeName(locale)}</summary>
              <label className="field">
                <span>{m.product.name}</span>
                <input name={`name.${locale}`} type="text" maxLength={LIMITS.name} defaultValue={get(product?.name, locale)} />
              </label>
              <label className="field">
                <span>{m.product.short}</span>
                <input name={`short.${locale}`} type="text" maxLength={LIMITS.short} defaultValue={get(product?.short, locale)} />
              </label>
              <label className="field">
                <span>{m.product.description}</span>
                <textarea name={`description.${locale}`} rows={3} maxLength={LIMITS.description} defaultValue={get(product?.description, locale)} />
              </label>
              <label className="field">
                <span>{m.product.promoLabel}</span>
                <input name={`promoLabel.${locale}`} type="text" maxLength={LIMITS.promoLabel} defaultValue={get(product?.promoLabel, locale)} />
              </label>
              {facts.map((fact, index) => (
                <div className="pair" key={index}>
                  <label className="field">
                    <span>{format(m.product.factLabel, { n: index + 1 })}</span>
                    <input name={`facts.${index}.label.${locale}`} type="text" maxLength={LIMITS.factLabel} defaultValue={get(fact?.label, locale)} />
                  </label>
                  <label className="field">
                    <span>{format(m.product.factValue, { n: index + 1 })}</span>
                    <input name={`facts.${index}.value.${locale}`} type="text" maxLength={LIMITS.factValue} defaultValue={get(fact?.value, locale)} />
                  </label>
                </div>
              ))}
            </details>
          ))}
        </section>
      ) : null}

      <section className="card">
        {withPhotos ? (
          <label className="field">
            <span>{m.product.photos}</span>
            <input name="photos" type="file" accept="image/*" multiple data-shrink />
            <small>{m.product.photosHint}</small>
          </label>
        ) : null}
        <label className="check">
          <input name="visible" type="checkbox" value="1" defaultChecked={product ? product.visible : true} />
          <span>
            <strong>{m.product.visible}</strong>
            <small className="hint">{m.product.visibleHint}</small>
          </span>
        </label>
      </section>
    </>
  );
}
