import type { Product } from "@/lib/tenant/types";
import type { View } from "../lib/view";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ view, products, priorityCount = 0 }: { view: View; products: Product[]; priorityCount?: number }) {
  return (
    <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product, i) => (
        <ProductCard
          key={product.id}
          product={product}
          href={view.links.product[product.slug]}
          locale={view.locale}
          ui={view.ui}
          index={i}
          priority={i < priorityCount}
          show3dTag={view.tenant.features.threeD}
        />
      ))}
    </div>
  );
}
