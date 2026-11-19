"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Magnetic hover for call-to-action buttons (fine pointers only).
 * Transform-only, so it never triggers layout.
 */
export function Magnetic({ children, strength = 0.3, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  const onMove = (event: React.PointerEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el || event.pointerType !== "mouse" || prefersReducedMotion()) return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - (rect.left + rect.width / 2)) * strength;
    const y = (event.clientY - (rect.top + rect.height / 2)) * strength;
    gsap.to(el, { x, y, duration: 0.5, ease: "power3.out", overwrite: "auto" });
  };
  const onLeave = () => {
    if (!ref.current) return;
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.4)", overwrite: "auto" });
  };

  return (
    <span ref={ref} className={`magnetic ${className}`} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </span>
  );
}
