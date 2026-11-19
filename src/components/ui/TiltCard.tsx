"use client";

import { useRef, type ReactNode } from "react";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";

/**
 * 3D tilt + light sheen following the mouse (fine pointers only, transform-only).
 * Hover lift is handled in CSS; touch devices simply get the static card.
 */
export function TiltCard({ children, className = "", max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || event.pointerType !== "mouse" || prefersReducedMotion()) return;
    const { clientX, clientY } = event;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const px = (clientX - rect.left) / rect.width;
      const py = (clientY - rect.top) / rect.height;
      el.style.transform = `perspective(900px) rotateX(${((0.5 - py) * max).toFixed(2)}deg) rotateY(${((px - 0.5) * max).toFixed(2)}deg) translate3d(0, -6px, 0)`;
      el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
    });
  };
  const onLeave = () => {
    cancelAnimationFrame(frame.current);
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <div ref={ref} className={`tilt ${className}`} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
      <div aria-hidden className="tilt-shine absolute inset-0 rounded-[inherit]" />
    </div>
  );
}
