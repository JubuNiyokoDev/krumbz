"use client";

import { useTranslations } from "next-intl";
import type { ProductContent } from "@/lib/content";
import { useCart } from "@/store/cart";
import { PackIllustration } from "@/components/ui/PackIllustration";
import { TrashIcon } from "@/components/ui/Icons";
import { QuantityStepper } from "./QuantityStepper";
import { PriceTag } from "./PriceTag";

export function CartLineItem({ product, quantity, tone = "light" }: { product: ProductContent; quantity: number; tone?: "light" | "dark" }) {
  const t = useTranslations("common");
  const brand = useTranslations("brand");
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const muted = tone === "dark" ? "text-cream/80" : "text-navy/75";
  return (
    <li className="flex gap-4 py-4">
      <div className={`grid h-20 w-20 shrink-0 place-items-center rounded-2xl ${tone === "dark" ? "bg-navy-soft" : "bg-cream-deep"}`}>
        <PackIllustration model={product.model} brand={brand("name")} tagline={brand("tagline")} className="h-16 w-16" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold leading-tight">{product.name}</p>
            <p className={`text-sm ${muted}`}>
              <PriceTag product={product} tone={tone} />
            </p>
          </div>
          <button
            type="button"
            onClick={() => remove(product.id)}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-rust/10 hover:text-rust ${muted}`}
            aria-label={`${t("remove")} — ${product.name}`}
          >
            <TrashIcon size={19} />
          </button>
        </div>
        <QuantityStepper value={quantity} onChange={(q) => setQuantity(product.id, q)} productName={product.name} size="sm" tone={tone} />
      </div>
    </li>
  );
}
