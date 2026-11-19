"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ProductContent } from "@/lib/content";
import { formatPrice } from "@/lib/order/whatsapp";
import { hasToComplete, ToCompleteBadge } from "@/components/ui/ToComplete";

/** Price of a product: formatted BIF, a « À COMPLÉTER » badge, or « Prix à confirmer ». */
export function PriceTag({
  product,
  className = "",
  tone,
}: {
  product: Pick<ProductContent, "price" | "priceDisplay">;
  className?: string;
  tone?: "light" | "dark";
}) {
  const t = useTranslations("common");
  const locale = useLocale();
  if (product.price !== null) return <span className={className}>{formatPrice(product.price, locale)}</span>;
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
