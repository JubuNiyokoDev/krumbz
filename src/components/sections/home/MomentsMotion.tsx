"use client";

import { useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useRenderMode } from "@/store/experience";
import { scrollToTarget } from "@/hooks/useUi";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Scroll choreography of the 7 moments (full-viewport panels):
 * - each panel's image opens from a rounded window (clip-path + scale, scrubbed),
 * - the copy rises in, the leaving panel lags behind and dims (stacked effect),
 * - a progress rail (desktop) / segmented bar (mobile) tracks the active moment.
 * Reduced motion → no scrubbed effects; static render mode → simple fades.
 */
export function MomentsMotion({
  children,
  labels,
  progressLabel,
  goToLabels,
}: {
  children: ReactNode;
  labels: string[];
  progressLabel: string;
  goToLabels: string[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const mode = useRenderMode();
  const total = labels.length;

  useGSAP(
    () => {
      const root = rootRef.current;
      const rail = railRef.current;
      if (!root || !rail) return;
      const scenes = gsap.utils.toArray<HTMLElement>("[data-scene]", root);
      const fill = rail.querySelectorAll<HTMLElement>("[data-progress-fill]");

      gsap.set(rail, { autoAlpha: 0 });
      ScrollTrigger.create({
        trigger: root,
        start: "top 55%",
        end: "bottom 45%",
        onToggle: (self) => gsap.to(rail, { autoAlpha: self.isActive ? 1 : 0, duration: 0.35, overwrite: true }),
        onUpdate: (self) => gsap.set(fill, { scaleX: self.progress, scaleY: self.progress }),
      });
      scenes.forEach((scene, i) => {
        ScrollTrigger.create({
          trigger: scene,
          start: "top center",
          end: "bottom center",
          onToggle: (self) => {
            if (self.isActive) setActive(i);
          },
        });
      });

      const mm = gsap.matchMedia();
      mm.add(
        { motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" },
        (context) => {
          const { motion } = context.conditions as { motion: boolean; reduce: boolean };
          if (!motion) return;
          scenes.forEach((scene, i) => {
            const media = scene.querySelector<HTMLElement>("[data-scene-media]");
            const image = scene.querySelector<HTMLElement>("[data-scene-image]");
            const copy = scene.querySelector<HTMLElement>("[data-scene-copy]");
            const inner = scene.querySelector<HTMLElement>("[data-scene-inner]");
            const dim = scene.querySelector<HTMLElement>("[data-scene-dim]");
            const copyItems = copy ? Array.from(copy.children) : [];

            if (mode === "static") {
              gsap.from(copyItems, {
                autoAlpha: 0,
                y: 24,
                stagger: 0.08,
                duration: 0.7,
                ease: "power2.out",
                scrollTrigger: { trigger: scene, start: "top 65%", toggleActions: "play none none reverse" },
              });
              return;
            }

            const enter = { trigger: scene, start: "top bottom", end: "top top", scrub: true };
            if (i > 0 && media) {
              gsap.fromTo(
                media,
                { clipPath: window.innerWidth < 768 ? "inset(9% 5% 9% 5% round 2rem)" : "inset(14% 8% 14% 8% round 3rem)" },
                { clipPath: "inset(0% 0% 0% 0% round 0rem)", ease: "none", scrollTrigger: enter },
              );
            }
            if (image) gsap.fromTo(image, { scale: 1.28 }, { scale: 1, ease: "none", scrollTrigger: enter });
            if (copyItems.length) {
              gsap.fromTo(
                copyItems,
                { y: 70, autoAlpha: 0 },
                {
                  y: 0,
                  autoAlpha: 1,
                  stagger: 0.12,
                  ease: "none",
                  scrollTrigger: { trigger: scene, start: i === 0 ? "top 80%" : "top 70%", end: "top 15%", scrub: true },
                },
              );
            }
            if (i < scenes.length - 1 && inner) {
              const leave = { trigger: scene, start: "top top", end: "bottom top", scrub: true };
              gsap.fromTo(inner, { yPercent: 0, scale: 1 }, { yPercent: 26, scale: 0.94, ease: "none", scrollTrigger: leave });
              if (dim) gsap.fromTo(dim, { opacity: 0 }, { opacity: 0.6, ease: "none", scrollTrigger: leave });
            }
          });
        },
      );
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [mode] },
  );

  const goTo = (i: number) => {
    const scene = rootRef.current?.querySelectorAll<HTMLElement>("[data-scene]")[i];
    if (scene) scrollToTarget(scene);
  };

  return (
    // `isolate`: the scenes' rising z-index (stacked panels) stays inside this
    // stacking context, below the fixed 3D canvas (z-5) — otherwise every scene
    // from the 5th on would hide the travelling products.
    <div ref={rootRef} className="relative isolate">
      <nav ref={railRef} aria-label={progressLabel} className="invisible fixed z-40 opacity-0 max-lg:inset-x-0 max-lg:top-0 lg:right-6 lg:top-1/2 lg:-translate-y-1/2">
        {/* mobile: segmented bar + current label */}
        <div className="flex items-center gap-3 bg-navy/55 px-4 py-2 text-cream backdrop-blur-md lg:hidden">
          <span className="font-display text-sm font-semibold tabular-nums" aria-hidden>
            {String(active + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
          </span>
          <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-cream/25">
            <span data-progress-fill className="absolute inset-0 origin-left scale-x-0 rounded-full bg-gold" />
          </span>
          <span className="max-w-[40%] truncate text-sm font-semibold" aria-live="polite">
            {labels[active]}
          </span>
        </div>
        {/* desktop: vertical rail */}
        <ol className="relative hidden flex-col items-center gap-2 rounded-full bg-navy/50 px-1.5 py-3 backdrop-blur-md lg:flex">
          <span aria-hidden className="absolute bottom-6 left-1/2 top-6 w-0.5 -translate-x-1/2 rounded-full bg-cream/25">
            <span data-progress-fill className="absolute inset-0 origin-top scale-y-0 rounded-full bg-gold" />
          </span>
          {labels.map((label, i) => (
            <li key={label} className="relative">
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={goToLabels[i]}
                aria-current={i === active ? "step" : undefined}
                className="group relative grid h-7 w-7 place-items-center rounded-full"
              >
                <span
                  aria-hidden
                  className={`pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-full bg-navy/80 px-3 py-1 font-display text-sm font-semibold text-cream backdrop-blur transition-all duration-500 ease-out-expo ${
                    i === active ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
                  }`}
                >
                  {label}
                </span>
                <span className={`scene-progress-dot block h-3 w-3 rounded-full ring-2 ring-cream/80 ${i === active ? "scale-125 bg-gold" : "bg-navy"}`} />
              </button>
            </li>
          ))}
        </ol>
      </nav>
      {children}
    </div>
  );
}
