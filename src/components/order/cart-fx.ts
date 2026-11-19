"use client";

import gsap from "gsap";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

export const CART_BUMP_EVENT = "krumbz:cart-bump";

const MINI_BISCUIT = `<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#e2a23a" stroke="#b97a1c" stroke-width="2.5" stroke-dasharray="4 2.2"/><circle cx="20" cy="20" r="13" fill="#efb551"/><g fill="#a4501a" opacity=".75"><circle cx="20" cy="20" r="1.8"/><circle cx="14" cy="15" r="1.6"/><circle cx="26" cy="15" r="1.6"/><circle cx="14" cy="25" r="1.6"/><circle cx="26" cy="25" r="1.6"/></g></svg>`;

/** A small biscuit flies from the clicked button to the header cart, then the cart bumps. */
export function flyToCart(from: HTMLElement | null) {
  const target = Array.from(document.querySelectorAll<HTMLElement>("[data-cart-target]")).find(
    (el) => el.getClientRects().length > 0,
  );
  const bump = () => window.dispatchEvent(new CustomEvent(CART_BUMP_EVENT));
  if (!from || !target || prefersReducedMotion()) {
    bump();
    return;
  }
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const startX = a.left + a.width / 2;
  const startY = a.top + a.height / 2;
  const dx = b.left + b.width / 2 - startX;
  const dy = b.top + b.height / 2 - startY;

  const dot = document.createElement("div");
  dot.className = "cart-fly";
  dot.innerHTML = MINI_BISCUIT;
  dot.style.left = `${startX}px`;
  dot.style.top = `${startY}px`;
  document.body.appendChild(dot);

  const lift = Math.min(140, Math.abs(dy) * 0.35 + 60);
  gsap
    .timeline({
      onComplete: () => {
        dot.remove();
        bump();
      },
    })
    .fromTo(dot, { scale: 0.4, rotate: -40 }, { scale: 1.1, duration: 0.25, ease: "back.out(3)" }, 0)
    .to(dot, { x: dx, duration: 0.75, ease: "power1.inOut" }, 0.05)
    .to(dot, { y: -lift, duration: 0.3, ease: "power2.out" }, 0.05)
    .to(dot, { y: dy, duration: 0.45, ease: "power2.in" }, 0.35)
    .to(dot, { rotate: 300, scale: 0.45, duration: 0.75, ease: "power1.in" }, 0.05);
}
