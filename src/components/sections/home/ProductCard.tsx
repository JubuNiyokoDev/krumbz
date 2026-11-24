import type { ProductContent } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import { TiltCard } from "@/components/ui/TiltCard";
import { ProductVisual } from "@/components/ui/ProductVisual";
import { TextWithToComplete } from "@/components/ui/ToComplete";
import { ArrowRightIcon } from "@/components/ui/Icons";
import { AddToCartButton } from "@/components/order/AddToCartButton";
import { PriceTag } from "@/components/order/PriceTag";

export interface ProductCardLabels {
  brand: string;
  tagline: string;
  weight: string;
  units: string;
  price: string;
  learnMore: string;
  toComplete: string;
  toCompleteHint: string;
}

/** Product card with tilt/lift, pack illustration, facts and add-to-cart. */
export function ProductCard({ product, labels, showLearnMore = true }: { product: ProductContent; labels: ProductCardLabels; showLearnMore?: boolean }) {
  // Krumbz: net weight and contents, always shown. Other shops: their first two facts, when filled in.
  const bespoke = product.model !== "product";
  const facts = [
    { key: "weight", label: bespoke ? labels.weight : (product.factLabels?.[0] ?? ""), value: product.weight },
    { key: "units", label: bespoke ? labels.units : (product.factLabels?.[1] ?? ""), value: product.unitsPerPack },
  ].filter((fact) => bespoke || (fact.label && fact.value));

  return (
    <TiltCard className="group relative flex h-full flex-col rounded-[2rem] bg-cream p-6 shadow-biscuit ring-1 ring-navy/5 transition-shadow duration-500 hover:shadow-lift sm:p-7">
      <div className="relative mx-auto mb-4 grid h-48 w-full place-items-center">
        <div aria-hidden className="blob absolute h-40 w-40 bg-gold-light/60 transition-transform duration-700 ease-out-back group-hover:scale-110 group-hover:rotate-12" />
        <ProductVisual
          model={product.model}
          image={product.image}
          brand={labels.brand}
          tagline={product.model === "carton" ? labels.tagline : ""}
          className="relative h-44 w-44 drop-shadow-[0_18px_22px_rgb(var(--color-rust-rgb)/0.3)] transition-transform duration-700 ease-out-back group-hover:-translate-y-2 group-hover:-rotate-3"
        />
      </div>
      <p className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-rust">{product.short}</p>
      <h3 className="mt-1 font-display text-[1.9rem] font-bold leading-tight">{product.name}</h3>
      <p className="mt-2 text-navy/80">{product.description}</p>

      {facts.length ? (
        <dl className={`mt-5 grid gap-3 text-sm ${facts.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {facts.map((fact) => (
            <div key={fact.key} className="rounded-2xl bg-cream-deep/70 px-3 py-2.5">
              <dt className="font-semibold text-navy/75">{fact.label}</dt>
              <dd className="mt-0.5 font-display text-base font-semibold">
                <TextWithToComplete value={fact.value} label={labels.toComplete} hint={labels.toCompleteHint} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-navy/10 pt-4">
        <span className="text-sm font-semibold text-navy/75">{labels.price}</span>
        <PriceTag product={product} className="font-display text-lg font-semibold" />
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
        <AddToCartButton productId={product.id} productName={product.name} className="flex-1" />
        {showLearnMore ? (
          <Link href="/produits" className="inline-flex items-center gap-1.5 rounded-full px-3 py-3 font-semibold text-rust underline-offset-4 hover:underline">
            {labels.learnMore}
            <ArrowRightIcon size={18} />
            <span className="sr-only"> — {product.name}</span>
          </Link>
        ) : null}
      </div>
    </TiltCard>
  );
}
