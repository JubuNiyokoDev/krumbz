import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addImagesAction,
  moveImageAction,
  removeImageAction,
  updateImageAction,
  updateProductAction,
} from "@/espace/actions";
import { ActionForm } from "@/espace/components/ActionForm";
import { ProductFields } from "@/espace/components/ProductFields";
import { Shell } from "@/espace/components/Shell";
import { SubmitButton } from "@/espace/components/SubmitButton";
import { espaceMessages, format } from "@/espace/i18n";
import { vendorContext } from "@/espace/server";
import { LIMITS } from "@/lib/espace/validation";
import { loadProductForEdit } from "@/lib/espace/products";
import { espacePath } from "@/lib/auth/guards";
import type { Localized, PlatformLocale } from "@/lib/tenant/types";

const value = (text: Localized | null | undefined, locale: PlatformLocale) => text?.[locale] ?? "";

export async function generateMetadata({ params }: PageProps<"/espace/[locale]/produits/[id]">): Promise<Metadata> {
  return { title: espaceMessages((await params).locale).product.editTitle };
}

/** Product editor: texts, price, photos (order, alt text, delete, upload). */
export default async function EditProductPage({ params }: PageProps<"/espace/[locale]/produits/[id]">) {
  const { locale: rawLocale, id } = await params;
  const { locale, m, deps } = await vendorContext(rawLocale);
  const found = await loadProductForEdit(deps, id);
  if (!found) notFound();
  const { tenant, product, images } = found;

  return (
    <Shell locale={locale} m={m} path={`/produits/${id}`} shopName={tenant.name}>
      <p className="back">
        <Link href={espacePath(locale, "/")} prefetch={false}>
          ← {m.common.back}
        </Link>
      </p>
      <h1>{m.product.editTitle}</h1>

      <ActionForm
        action={updateProductAction.bind(null, locale, id)}
        submitLabel={m.common.save}
        pendingLabel={m.common.saving}
        errorTitle={m.common.errorTitle}
        testId="product-form"
      >
        <ProductFields m={m} locales={tenant.locales} product={product} />
      </ActionForm>

      <section className="card" aria-labelledby="photos">
        <h2 id="photos">
          {m.photos.title} <span className="muted">({format(m.photos.count, { count: images.length, max: LIMITS.imagesPerProduct })})</span>
        </h2>
        {images.length === 0 ? <p className="muted">{m.photos.empty}</p> : null}
        <ul className="photos">
          {images.map((image, index) => (
            <li key={image.id} className="photo" data-testid="product-image" data-image-id={image.id}>
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded WebP variants are already resized */}
              <img src={image.thumb || image.url} alt={value(image.alt, locale) || ""} width={96} height={96} loading="lazy" decoding="async" />
              <div>
                {index === 0 ? <p className="badge badge-visible">{m.photos.main}</p> : null}
                <ActionForm
                  action={updateImageAction.bind(null, locale, image.id)}
                  submitLabel={m.photos.saveAlt}
                  pendingLabel={m.common.saving}
                  errorTitle={m.common.errorTitle}
                  className="compact"
                >
                  {tenant.locales.map((code) => (
                    <label key={code} className="field">
                      <span>
                        {m.photos.alt} ({m.locales[code]})
                      </span>
                      <input name={`alt.${code}`} type="text" maxLength={LIMITS.alt} defaultValue={value(image.alt, code)} />
                    </label>
                  ))}
                </ActionForm>
                <div className="actions">
                  {index > 0 ? (
                    <form action={moveImageAction.bind(null, locale, image.id, "up")}>
                      <SubmitButton label={`${m.common.moveUp} · ${value(image.alt, locale) || image.id}`}>↑</SubmitButton>
                    </form>
                  ) : null}
                  {index < images.length - 1 ? (
                    <form action={moveImageAction.bind(null, locale, image.id, "down")}>
                      <SubmitButton label={`${m.common.moveDown} · ${value(image.alt, locale) || image.id}`}>↓</SubmitButton>
                    </form>
                  ) : null}
                  <form action={removeImageAction.bind(null, locale, image.id)}>
                    <SubmitButton className="btn btn-danger" confirmText={m.photos.confirmDelete} label={m.photos.delete}>
                      {m.photos.delete}
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {images.length < LIMITS.imagesPerProduct ? (
          <ActionForm
            action={addImagesAction.bind(null, locale, id)}
            submitLabel={m.photos.upload}
            pendingLabel={m.photos.uploading}
            errorTitle={m.common.errorTitle}
            testId="photos-form"
            resetOnSuccess
          >
            <label className="field">
              <span>{m.photos.choose}</span>
              <input name="photos" type="file" accept="image/*" multiple data-shrink required />
              <small>{m.product.photosHint}</small>
            </label>
          </ActionForm>
        ) : null}
      </section>
    </Shell>
  );
}
