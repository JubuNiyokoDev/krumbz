"use client";

import { useLocale, useTranslations } from "next-intl";
import type { OrderLine } from "@/lib/order/types";
import { formatPrice, orderSubtotal } from "@/lib/order/whatsapp";

export function CartTotals({ lines, tone = "light" }: { lines: OrderLine[]; tone?: "light" | "dark" }) {
  const t = useTranslations("order");
  const locale = useLocale();
  const subtotal = orderSubtotal(lines);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-display text-lg font-semibold">{t("subtotal")}</span>
        <span className="font-display text-xl font-bold tabular-nums">{subtotal !== null ? formatPrice(subtotal, locale) : "—"}</span>
      </div>
      <p className={`text-sm ${tone === "dark" ? "text-cream/80" : "text-navy/75"}`}>
        {t("itemsCount", { count })}
        {subtotal === null ? <> · {t("totalUnknown")}</> : null}
      </p>
    </div>
  );
}
