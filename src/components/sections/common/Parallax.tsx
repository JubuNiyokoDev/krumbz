"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useRenderMode } from "@/store/experience";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Scroll parallax + reveal for an image box (transform only; off with reduced motion / static mode). */
export function Parallax({ children, className = "", amount = 9 }: { children: ReactNode; className?: string; amount?: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const mode = useRenderMode();

  useGSAP(
    () => {
      if (!outer.current || !inner.current || mode === "static") return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          inner.current,
          { yPercent: -amount, scale: 1.18 },
          { yPercent: amount, scale: 1.08, ease: "none", scrollTrigger: { trigger: outer.current, start: "top bottom", end: "bottom top", scrub: true } },
        );
        gsap.fromTo(
          outer.current,
          { clipPath: "inset(10% 10% 10% 10% round 2.5rem)" },
          { clipPath: "inset(0% 0% 0% 0% round 2.5rem)", ease: "none", scrollTrigger: { trigger: outer.current, start: "top 95%", end: "top 40%", scrub: true } },
        );
      });
      return () => mm.revert();
    },
    { dependencies: [mode, amount] },
  );

  return (
    <div ref={outer} className={`relative overflow-hidden ${className}`}>
      <div ref={inner} className="absolute inset-0 will-change-transform">
        {children}
      </div>
    </div>
  );
}
