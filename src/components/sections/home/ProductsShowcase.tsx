import type { CSSProperties, ReactNode } from "react";
import type { ProductContent } from "@/lib/content";
import { StageAnchor } from "@/components/experience/StageAnchor";
import { SectionHeading } from "../SectionHeading";
import { ProductCard, type ProductCardLabels } from "./ProductCard";

export function ProductsShowcase({
  eyebrow,
  title,
  subtitle,
  products,
  labels,
  fallback,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  products: ProductContent[];
  labels: ProductCardLabels;
  fallback: ReactNode;
}) {
  return (
    <section data-stage="products" aria-labelledby="products-title" className="grain relative overflow-hidden bg-cream-deep py-24 sm:py-28 lg:py-36">
      <div aria-hidden className="blob pointer-events-none absolute -right-[25vw] -top-[10vw] h-[60vw] w-[60vw] bg-cream/70 lg:h-[34vw] lg:w-[34vw]" />
      <div className="relative mx-auto grid max-w-[88rem] gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-x-16 lg:px-10">
        <SectionHeading id="products-title" eyebrow={eyebrow} title={title} lead={subtitle} className="lg:col-start-2" />
        <div className="relative flex items-center justify-center lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <div aria-hidden className="absolute h-[min(80vw,32rem)] w-[min(80vw,32rem)] rounded-full bg-gold/30 blur-3xl" />
          <StageAnchor id="products" fallback={fallback} className="aspect-square w-[min(80vw,34rem)] lg:sticky lg:top-[20svh]" />
        </div>
        <ul className="grid gap-6 sm:grid-cols-2 lg:col-start-2">
          {products.map((product, i) => (
            <li key={product.id} data-reveal style={{ "--reveal-delay": `${i * 120}ms` } as CSSProperties}>
              <ProductCard product={product} labels={labels} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
