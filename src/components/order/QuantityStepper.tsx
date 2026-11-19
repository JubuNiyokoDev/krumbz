"use client";

import { useTranslations } from "next-intl";
import { MAX_QUANTITY } from "@/store/cart";
import { MinusIcon, PlusIcon } from "@/components/ui/Icons";

/** − [n] + stepper. The input is editable; 0 removes the line (handled by the store). */
export function QuantityStepper({
  value,
  onChange,
  productName,
  min = 0,
  size = "md",
  tone = "light",
}: {
  value: number;
  onChange: (value: number) => void;
  productName: string;
  min?: number;
  size?: "sm" | "md";
  tone?: "light" | "dark";
}) {
  const t = useTranslations("common");
  const btn =
    size === "sm"
      ? "h-9 w-9"
      : "h-11 w-11";
  const surface = tone === "dark" ? "bg-navy-soft text-cream ring-cream/25" : "bg-cream text-navy ring-navy/15";
  return (
    <div className={`inline-flex items-center gap-1 rounded-full p-1 ring-1 ${surface}`} role="group" aria-label={`${t("quantity")} — ${productName}`}>
      <button
        type="button"
        className={`${btn} grid place-items-center rounded-full transition-transform duration-300 ease-out-back hover:scale-110 hover:bg-gold/30 active:scale-90 disabled:opacity-40 disabled:hover:scale-100`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`${t("decrease")} — ${productName}`}
      >
        <MinusIcon size={18} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={MAX_QUANTITY}
        value={value}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10);
          onChange(Number.isFinite(n) ? Math.max(min, Math.min(MAX_QUANTITY, n)) : min);
        }}
        onFocus={(e) => e.target.select()}
        aria-label={`${t("quantity")} — ${productName}`}
        className={`${size === "sm" ? "w-9 text-base" : "w-12 text-lg"} [appearance:textfield] bg-transparent text-center font-display font-semibold tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      />
      <button
        type="button"
        className={`${btn} grid place-items-center rounded-full transition-transform duration-300 ease-out-back hover:scale-110 hover:bg-gold/30 active:scale-90 disabled:opacity-40 disabled:hover:scale-100`}
        onClick={() => onChange(Math.min(MAX_QUANTITY, value + 1))}
        disabled={value >= MAX_QUANTITY}
        aria-label={`${t("increase")} — ${productName}`}
      >
        <PlusIcon size={18} />
      </button>
    </div>
  );
}
