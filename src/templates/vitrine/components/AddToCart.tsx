"use client";

import { useState } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { useCart, useVitrine } from "../lib/context";
import { useVitrineUi } from "../lib/ui";
import { Icon } from "./primitives";

/** Flies a copy of the product image to the cart button (Web Animations API). */
function flyToCart(from: Element | null | undefined) {
  if (!from || prefersReducedMotion()) return;
  const target = document.querySelector("[data-cart-target]");
  const src = from instanceof HTMLImageElement ? from.currentSrc || from.src : null;
  if (!target || !src) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const size = Math.min(a.width, a.height, 160);
  const ghost = document.createElement("div");
  ghost.className = "vt-fly";
  ghost.style.cssText = `left:${a.left + a.width / 2 - size / 2}px;top:${a.top + a.height / 2 - size / 2}px;width:${size}px;height:${size}px`;
  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  ghost.appendChild(img);
  (document.querySelector(".vt") ?? document.body).appendChild(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const animation = ghost.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy - 120}px) scale(0.55) rotate(-12deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.12) rotate(-20deg)`, opacity: 0.4 },
    ],
    { duration: 850, easing: "cubic-bezier(0.5, 0, 0.2, 1)" },
  );
  animation.onfinish = () => ghost.remove();
}

export function AddToCart({
  productId,
  quantity = 1,
  option = null,
  className = "",
  compact = false,
  onAdded,
}: {
  productId: string;
  quantity?: number;
  option?: string | null;
  className?: string;
  compact?: boolean;
  onAdded?: () => void;
}) {
  const { ui } = useVitrine();
  const add = useCart()((s) => s.add);
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      className={`vt-btn ${compact ? "vt-btn--sm" : ""} ${className}`}
      onClick={(event) => {
        add(productId, quantity, option);
        flyToCart(event.currentTarget.closest("[data-product-scope]")?.querySelector("[data-fly-source]"));
        window.setTimeout(() => useVitrineUi.getState().bump(), 700);
        setDone(true);
        window.setTimeout(() => setDone(false), 1600);
        onAdded?.();
      }}
      aria-live="polite"
    >
      <Icon name={done ? "check" : "cart"} className="size-5" />
      {done ? ui.added : ui.addToCart}
    </button>
  );
}
