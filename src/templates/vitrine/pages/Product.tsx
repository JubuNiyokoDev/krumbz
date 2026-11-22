import Link from "next/link";
import type { Product } from "@/lib/tenant/types";
import { tx } from "../lib/i18n";
import type { View } from "../lib/view";
import { DepthCarousel } from "../components/DepthCarousel";
import { PageTop } from "../components/Heading";
import { ProductBuy } from "../components/ProductBuy";
import { Relief } from "../components/Relief";
import { Icon, Img, Price } from "../components/primitives";

export function ProductPage({ view, product }: { view: View; product: Product }) {
  const { tenant, locale, ui, links, products } = view;
  const name = tx(product.name, locale);
  const promo = product.promoLabel ? tx(product.promoLabel, locale) : product.compareAtPrice && product.price !== null && product.compareAtPrice > product.price ? ui.promo : null;
  const description = tx(product.description, locale);
  const related = products.filter((p) => p.id !== product.id);

  const info = (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {promo && <span className="vt-card__tag !static !transform-none">{promo}</span>}
        {product.featured && <span className="vt-chip !py-1 text-xs">{ui.featuredTag}</span>}
      </div>
      <h1 id="vt-page-title" className="vt-h1 !text-[clamp(2.4rem,5.6vw,4.6rem)]">
        {name}
      </h1>
      <p className="vt-lead">{tx(product.short, locale)}</p>
      <Price price={product.price} compareAt={product.compareAtPrice} onRequest={ui.priceOnRequest} className="text-[1.7rem]" />
    </div>
  );

  return (
    <>
      <PageTop labelledBy="vt-page-title">
        <nav aria-label={ui.breadcrumb} className="vt-muted mb-8 flex flex-wrap items-center gap-2 text-sm font-semibold">
          <Link href={links.home} className="vt-link-underline">{ui.home}</Link>
          <Icon name="right" className="size-3.5" />
          <Link href={links.products} className="vt-link-underline">{ui.products}</Link>
          <Icon name="right" className="size-3.5" />
          <span aria-current="page" style={{ color: "var(--vt-text)" }}>{name}</span>
        </nav>
        <ProductBuy
          product={{
            id: product.id,
            name,
            modelUrl: tenant.features.threeD ? product.modelUrl : null,
            images: product.images.map((img) => ({ url: img.url, alt: tx(img.alt, locale), width: img.width, height: img.height })),
          }}
          accent={tenant.theme.colors.accent}
          info={info}
        >
          {description && (
            <div className="grid gap-3 border-t pt-7" style={{ borderColor: "var(--vt-line)" }}>
              {description.split(/\n{2,}/).map((para, i) => (
                <p key={i} className="text-[1.02rem] leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          )}
          {product.facts.length > 0 && (
            <div className="grid gap-3">
              <h2 className="vt-h3 !text-[1.15rem]">{ui.facts}</h2>
              <dl className="vt-facts">
                {product.facts.map((f) => (
                  <div key={f.label.fr}>
                    <dt>{tx(f.label, locale)}</dt>
                    <dd>{tx(f.value, locale)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </ProductBuy>
      </PageTop>

      {related.length > 0 && (
        <section className="vt-section !pt-0" aria-labelledby="vt-related-title">
          <div className="vt-wrap grid gap-10">
            <h2 id="vt-related-title" className="vt-h2 !text-[clamp(1.8rem,4vw,3rem)]" data-reveal>
              {ui.related}
            </h2>
            <DepthCarousel
              label={ui.related}
              labels={related.map((p) => tx(p.name, locale))}
              slides={related.map((p) => (
                <Link key={p.id} href={links.product[p.slug]} className="grid gap-3" aria-label={`${tx(p.name, locale)} — ${ui.viewProduct}`}>
                  <Relief className="vt-card__stage">
                    <div className="vt-relief__media">
                      {p.images[0] && <Img src={p.images[0].url} alt={tx(p.images[0].alt, locale)} width={p.images[0].width} height={p.images[0].height} />}
                    </div>
                  </Relief>
                  <span className="flex items-baseline justify-between gap-3 px-1">
                    <span className="font-[family-name:var(--vt-font-display)] text-lg font-extrabold">{tx(p.name, locale)}</span>
                    <Price price={p.price} compareAt={null} onRequest={ui.priceOnRequest} className="text-sm" />
                  </span>
                </Link>
              ))}
            />
          </div>
        </section>
      )}

      <ProductJsonLd view={view} product={product} />
    </>
  );
}

function ProductJsonLd({ view, product }: { view: View; product: Product }) {
  const { tenant, locale } = view;
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: tx(product.name, locale),
    description: tx(product.short, locale),
    image: product.images.map((i) => i.url),
    brand: { "@type": "Brand", name: tenant.name },
    ...(product.price !== null
      ? { offers: { "@type": "Offer", price: product.price, priceCurrency: "BIF", availability: "https://schema.org/InStock", seller: { "@type": "Organization", name: tenant.name } } }
      : {}),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** Clean "unknown product" block (when the caller renders instead of calling notFound()). */
export function ProductNotFound({ view }: { view: View }) {
  const { ui, links } = view;
  return (
    <PageTop labelledBy="vt-page-title">
      <div className="grid max-w-2xl gap-6">
        <p className="vt-eyebrow">404</p>
        <h1 id="vt-page-title" className="vt-h1 !text-[clamp(2.4rem,6vw,4.6rem)]">
          {ui.notFoundTitle}
        </h1>
        <p className="vt-lead">{ui.notFoundText}</p>
        <Link href={links.products} className="vt-btn w-fit">
          {ui.backToProducts} <Icon name="arrow" className="vt-arrow size-5" />
        </Link>
      </div>
    </PageTop>
  );
}
