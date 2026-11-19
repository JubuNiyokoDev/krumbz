"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useCart } from "@/store/cart";
import { CartIcon, CheckIcon } from "@/components/ui/Icons";
import { flyToCart } from "./cart-fx";

/** Adds one unit (or `quantity`) with a flying-biscuit + check feedback and a polite announcement. */
export function AddToCartButton({
  productId,
  productName,
  quantity = 1,
  className = "",
  variant = "primary",
}: {
  productId: string;
  productName: string;
  quantity?: number;
  className?: string;
  variant?: "primary" | "gold";
}) {
  const t = useTranslations("common");
  const add = useCart((s) => s.add);
  const [added, setAdded] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <>
      <button
        type="button"
        className={`btn ${variant === "gold" ? "btn-gold" : "btn-primary"} ${className}`}
        onClick={(event) => {
          add(productId, quantity);
          flyToCart(event.currentTarget);
          setAdded(true);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setAdded(false), 1800);
        }}
      >
        <span className="relative grid h-5 w-5 place-items-center" aria-hidden>
          <span className={`absolute transition-all duration-500 ease-out-back ${added ? "scale-0 rotate-90 opacity-0" : "scale-100 opacity-100"}`}>
            <CartIcon size={20} />
          </span>
          <span className={`absolute transition-all duration-500 ease-out-back ${added ? "scale-100 opacity-100" : "scale-0 -rotate-90 opacity-0"}`}>
            <CheckIcon size={20} />
          </span>
        </span>
        {/* The accessible name stays « Ajouter au panier — … »; the change is announced by the status region. */}
        <span aria-hidden>{added ? t("added") : t("addToCart")}</span>
        <span className="sr-only">
          {t("addToCart")} — {productName}
        </span>
      </button>
      <span role="status" className="sr-only">
        {added ? t("addedToCart", { name: productName }) : ""}
      </span>
    </>
  );
}
