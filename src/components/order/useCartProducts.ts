"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ProductContent } from "@/lib/content";
import { useCart } from "@/store/cart";
import type { OrderLine } from "@/lib/order/types";

/** Products from content (client side). */
export function useProducts(): ProductContent[] {
  const t = useTranslations("products");
  return t.raw("items") as ProductContent[];
}

/** Cart lines joined with product data; unknown ids (old carts) are ignored. */
export function useCartLines(): { lines: OrderLine[]; products: ProductContent[]; hydrated: boolean } {
  const products = useProducts();
  const cartLines = useCart((s) => s.lines);
  const hydrated = useCart((s) => s.hydrated);
  const lines = useMemo(
    () =>
      cartLines.flatMap((line) => {
        const product = products.find((p) => p.id === line.id);
        return product && line.quantity > 0
          ? [{ id: product.id, name: product.name, quantity: line.quantity, unitPrice: product.price }]
          : [];
      }),
    [cartLines, products],
  );
  return { lines, products, hydrated };
}
