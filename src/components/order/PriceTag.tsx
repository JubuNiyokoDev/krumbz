"use client";

import { useTranslations } from "next-intl";
import type { ProductContent } from "@/lib/content";
import { formatPrice } from "@/lib/order/whatsapp";
import { hasToComplete, ToCompleteBadge } from "@/components/ui/ToComplete";

/**
 * Price of a product: formatted BIF, a « À COMPLÉTER » badge, or « Prix à confirmer ».
 * When `compareAtPrice` is higher than the current price, shows it struck through next
 * to a small promo badge (`products.promoLabel`), e.g. the end-of-year/Christmas promo.
 */
export function PriceTag({
  product,
  className = "",
  tone,
}: {
  product: Pick<ProductContent, "price" | "priceDisplay" | "compareAtPrice">;
  className?: string;
  tone?: "light" | "dark";
}) {
  const t = useTranslations("common");
  const tp = useTranslations("products");
  if (product.price !== null) {
    const onSale = product.compareAtPrice !== null && product.compareAtPrice > product.price;
    if (!onSale) return <span className={className}>{formatPrice(product.price)}</span>;
    return (
      <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
        <span className={`text-[0.75em] font-normal line-through ${tone === "dark" ? "text-cream/75" : "text-navy/75"}`}>
          {formatPrice(product.compareAtPrice as number)}
        </span>
        <span className={tone === "dark" ? "text-gold-light" : "text-rust"}>{formatPrice(product.price)}</span>
        <span className="rounded-full bg-rust px-2.5 py-0.5 text-[0.65em] font-semibold uppercase tracking-wide text-cream">
          {tp("promoLabel")}
        </span>
      </span>
    );
  }
  if (hasToComplete(product.priceDisplay)) {
    return (
      <span className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
        <span>{t("priceOnRequest")}</span>
        <ToCompleteBadge label={t("toComplete")} hint={t("toCompleteHint")} tone={tone} />
      </span>
    );
  }
  return <span className={className}>{product.priceDisplay || t("priceOnRequest")}</span>;
}
