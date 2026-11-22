"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Client root of the marketing page: smooth scroll (Lenis ↔ ScrollTrigger),
 * anchor scrolling, scroll reveals and the hero's pointer/scroll parallax.
 * Everything is declared with data attributes in server components:
 *   [data-reveal]  fade + rise on enter      [data-split]  masked words rise
 *   [data-words]   words light up (scrub)    [data-line]   progress line (scrub)
 *   [data-depth]   hero pointer parallax     [data-stage-scroll] hero scroll tilt
 *   [data-parallax-img] image drift inside its frame
 * Without JS (or with reduced motion) the page is fully visible and static.
 */
export function MotionRoot({ children, className = "" }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const reduced = useReducedMotion();

  /* Smooth scroll */
  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ autoRaf: false, lerp: 0.1, smoothWheel: true, syncTouch: false });
    lenisRef.current = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduced]);

  /* In-page anchors (smooth, header-aware, focus moved for keyboard users) */
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute("href")!.slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      event.preventDefault();
      const offset = id === "accueil" ? 0 : -24;
      if (lenisRef.current) lenisRef.current.scrollTo(target, { offset, duration: 1.4 });
      else target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      history.replaceState(null, "", `#${id}`);
      const focusTarget = target.querySelector<HTMLElement>("h1, h2") ?? target;
      if (!focusTarget.hasAttribute("tabindex")) focusTarget.setAttribute("tabindex", "-1");
      focusTarget.focus({ preventScroll: true });
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [reduced]);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      el.classList.toggle("rn-motion", !reduced);
      if (reduced) return;
      const q = gsap.utils.selector(el);

      /* Reveals */
      ScrollTrigger.batch(q("[data-reveal]"), {
        start: "top 88%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: "expo.out", stagger: 0.09, overwrite: true }),
      });

      /* Split headings */
      q("[data-split]").forEach((heading) => {
        gsap.to(heading.querySelectorAll(".rn-w > span"), {
          y: 0,
          duration: 1.15,
          ease: "expo.out",
          stagger: 0.05,
          scrollTrigger: { trigger: heading, start: "top 88%", once: true },
        });
      });

      /* Words lighting up */
      q("[data-words]").forEach((block) => {
        gsap.to(block.querySelectorAll(".rn-word"), {
          opacity: 1,
          stagger: 0.12,
          ease: "none",
          scrollTrigger: { trigger: block, start: "top 80%", end: "bottom 45%", scrub: 0.6 },
        });
      });

      /* Progress line */
      q("[data-line]").forEach((line) => {
        gsap.fromTo(
          line,
          { scaleX: 0 },
          { scaleX: 1, ease: "none", scrollTrigger: { trigger: line.closest("section"), start: "top 70%", end: "bottom 80%", scrub: 0.6 } },
        );
      });

      /* Image drift */
      q("[data-parallax-img]").forEach((img) => {
        gsap.fromTo(
          img,
          { yPercent: -6 },
          { yPercent: 6, ease: "none", scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true } },
        );
      });

      /* Hero: scroll tilt */
      const hero = q("[data-hero]")[0] as HTMLElement | undefined;
      const stage = q("[data-stage-scroll]")[0] as HTMLElement | undefined;
      if (hero && stage) {
        gsap.to(stage, {
          y: -70,
          rotationY: 14,
          rotationX: -6,
          scale: 0.94,
          ease: "none",
          scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.8 },
        });
      }

      /* Hero: pointer parallax (fine pointers only) */
      if (hero && window.matchMedia("(pointer: fine)").matches) {
        const layers = q("[data-depth]").map((layer) => {
          const depth = Number(layer.dataset.depth) || 1;
          return {
            depth,
            x: gsap.quickTo(layer, "x", { duration: 1.2, ease: "power3.out" }),
            y: gsap.quickTo(layer, "y", { duration: 1.2, ease: "power3.out" }),
            r: gsap.quickTo(layer, "rotationY", { duration: 1.4, ease: "power3.out" }),
          };
        });
        const onMove = (event: PointerEvent) => {
          const nx = event.clientX / window.innerWidth - 0.5;
          const ny = event.clientY / window.innerHeight - 0.5;
          for (const layer of layers) {
            layer.x(nx * 26 * layer.depth);
            layer.y(ny * 20 * layer.depth);
            layer.r(nx * 6 * layer.depth);
          }
        };
        hero.addEventListener("pointermove", onMove);
        return () => hero.removeEventListener("pointermove", onMove);
      }
    },
    { scope: root, dependencies: [reduced] },
  );

  /* Fonts swapping in can move triggers: refresh once they are ready. */
  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
