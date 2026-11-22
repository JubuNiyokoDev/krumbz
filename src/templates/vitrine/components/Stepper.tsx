"use client";

import { useVitrine } from "../lib/context";
import { MAX_QUANTITY } from "../lib/cart";

export function Stepper({
  value,
  onChange,
  label,
  small,
  allowZero,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  small?: boolean;
  allowZero?: boolean;
}) {
  const { ui } = useVitrine();
  const min = allowZero ? 0 : 1;
  return (
    <div className={`vt-stepper ${small ? "vt-stepper--sm" : ""}`} role="group" aria-label={`${ui.quantity} — ${label}`}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label={value - 1 < 1 && allowZero ? ui.remove : ui.decrease} disabled={value <= min}>
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(Math.min(MAX_QUANTITY, value + 1))} aria-label={ui.increase}>
        +
      </button>
    </div>
  );
}
