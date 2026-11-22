import Link from "next/link";
import { moveProductAction, setVisibilityAction } from "@/espace/actions";
import { Shell } from "@/espace/components/Shell";
import { SubmitButton } from "@/espace/components/SubmitButton";
import { format, formatBif, formatDate } from "@/espace/i18n";
import { storefrontUrl, vendorContext } from "@/espace/server";
import { espacePath } from "@/lib/auth/guards";
import { loadDashboard } from "@/lib/espace/products";

/** Vendor home: shop summary + product list (hide / show, reorder). */
export default async function EspaceHome({ params, searchParams }: PageProps<"/espace/[locale]">) {
  const { locale, m, deps } = await vendorContext((await params).locale);
  const welcome = (await searchParams).bienvenue === "1";
  const { tenant, products, subscription } = await loadDashboard(deps);
  const shopUrl = await storefrontUrl(tenant.slug);
  const subscriptionText = subscription
    ? `${m.dashboard.subscriptionStatus[subscription.status]} — ${
        subscription.endsAt ? format(m.dashboard.subscriptionUntil, { date: formatDate(subscription.endsAt, locale) }) : m.dashboard.subscriptionNoEnd
      }`
    : m.dashboard.subscriptionNone;

  return (
    <Shell locale={locale} m={m} path="/" shopName={tenant.name}>
      {welcome ? (
        <p className="notice notice-ok" role="status">
          {m.dashboard.passwordChanged}
        </p>
      ) : null}

      <section className="card summary" aria-labelledby="shop">
        <h1 id="shop">{tenant.name}</h1>
        <dl>
          <dt>{m.dashboard.subscription}</dt>
          <dd data-testid="subscription">{subscriptionText}</dd>
          <dt>{m.dashboard.shop}</dt>
          <dd>{m.dashboard.shopStatus[tenant.status]}</dd>
        </dl>
        <div className="row">
          <a className="btn" href={shopUrl} target="_blank" rel="noopener" data-testid="shop-link">
            {m.dashboard.viewShop} ↗
          </a>
          <Link className="btn btn-primary" href={espacePath(locale, "/produits/nouveau")} prefetch={false}>
            + {m.nav.newProduct}
          </Link>
          <Link className="btn" href={espacePath(locale, "/contacts")} prefetch={false}>
            {m.nav.contacts}
          </Link>
        </div>
      </section>

      <section className="card" aria-labelledby="list">
        <h2 id="list">
          {m.dashboard.title} <span className="muted">({format(m.dashboard.count, { count: products.length })})</span>
        </h2>
        {products.length === 0 ? <p className="muted">{m.dashboard.empty}</p> : null}
        <ul className="products">
          {products.map((product, index) => (
            <li key={product.id} className={`product${product.visible ? "" : " is-hidden"}`} data-testid="product-row" data-product-id={product.id}>
              {product.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element -- uploads are already resized (WebP variants)
                <img className="thumb" src={product.thumb} alt="" width={72} height={72} loading="lazy" decoding="async" />
              ) : (
                <span className="thumb" aria-hidden="true">
                  {m.dashboard.noPhoto}
                </span>
              )}
              <div>
                <h2>
                  {product.name}
                  {product.visible ? (
                    <span className="badge badge-visible">{m.dashboard.visible}</span>
                  ) : (
                    <span className="badge badge-hidden">{m.dashboard.hidden}</span>
                  )}
                </h2>
                <p className="price">
                  {product.price === null ? m.dashboard.priceOnRequest : formatBif(product.price)}
                  {product.promo && product.compareAtPrice !== null ? (
                    <>
                      <s>{formatBif(product.compareAtPrice)}</s>
                      <span className="badge badge-promo">{m.dashboard.promo}</span>
                    </>
                  ) : null}
                </p>
              </div>
              <div className="actions">
                <Link className="btn btn-primary" href={espacePath(locale, `/produits/${product.id}`)} prefetch={false}>
                  {m.dashboard.edit}
                </Link>
                <form action={setVisibilityAction.bind(null, locale, product.id, !product.visible)}>
                  <SubmitButton>{product.visible ? m.dashboard.hide : m.dashboard.show}</SubmitButton>
                </form>
                {index > 0 ? (
                  <form action={moveProductAction.bind(null, locale, product.id, "up")}>
                    <SubmitButton label={`${m.common.moveUp} : ${product.name}`}>↑</SubmitButton>
                  </form>
                ) : null}
                {index < products.length - 1 ? (
                  <form action={moveProductAction.bind(null, locale, product.id, "down")}>
                    <SubmitButton label={`${m.common.moveDown} : ${product.name}`}>↓</SubmitButton>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </Shell>
  );
}
