import Link from "next/link";
import type { PlatformLocale, Product } from "@/lib/tenant/types";
import { tx, type UiStrings } from "../lib/i18n";
import { Relief } from "./Relief";
import { Icon, Img, Price } from "./primitives";

export function ProductCard({
  product,
  href,
  locale,
  ui,
  index = 0,
  priority = false,
  show3dTag = true,
}: {
  product: Product;
  href: string;
  locale: PlatformLocale;
  ui: UiStrings;
  index?: number;
  priority?: boolean;
  show3dTag?: boolean;
}) {
  const image = product.images[0];
  const promo = product.promoLabel ? tx(product.promoLabel, locale) : product.compareAtPrice ? ui.promo : null;
  return (
    <article className="vt-card" data-reveal style={{ ["--d" as string]: `${(index % 3) * 90}ms` }}>
      <Link href={href} className="block" aria-label={`${tx(product.name, locale)} — ${ui.viewProduct}`}>
        <Relief className="vt-card__stage">
          {promo && <span className="vt-card__tag">{promo}</span>}
          {product.modelUrl && show3dTag && (
            <span className="vt-card__tag vt-card__tag--3d inline-flex items-center gap-1">
              <Icon name="cube" className="size-3.5" /> 3D
            </span>
          )}
          <div className="vt-relief__media">
            {image && (
              <Img
                src={image.url}
                alt={tx(image.alt, locale)}
                width={image.width}
                height={image.height}
                priority={priority}
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
              />
            )}
          </div>
        </Relief>
      </Link>
      <div className="grid gap-2 px-1">
        <h3 className="vt-h3">
          <Link href={href}>{tx(product.name, locale)}</Link>
        </h3>
        <p className="vt-muted line-clamp-2 text-[0.95rem]">{tx(product.short, locale)}</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <Price price={product.price} compareAt={product.compareAtPrice} onRequest={ui.priceOnRequest} className="text-[1.1rem]" />
          <Link href={href} className="vt-card__cta text-sm" tabIndex={-1} aria-hidden>
            {ui.discover} <Icon name="arrow" className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
