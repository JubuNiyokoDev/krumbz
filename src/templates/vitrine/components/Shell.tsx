"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCart, useMotionLevel, useVitrine } from "../lib/context";
import { useVitrineUi } from "../lib/ui";

gsap.registerPlugin(ScrollTrigger);

const COVER_MS = 520;

type Curtain = "idle" | "cover" | "reveal";

/**
 * Client shell of the template:
 * - per-shop cart hydration (+ sync between tabs);
 * - Lenis smooth scroll driven by the GSAP ticker (motion "full" only);
 * - scroll reveals ([data-reveal] → .is-in);
 * - page transition: a curtain in the shop's primary colour closes on internal
 *   link clicks, the router navigates, and it opens again once the new page is
 *   rendered — whether the host keeps this shell mounted (layout) or remounts
 *   it (catch-all page). Disabled for "simple" / reduced motion.
 */
export function Shell({ children }: { children: ReactNode }) {
  const { shopName } = useVitrine();
  const motion = useMotionLevel();
  const cart = useCart();
  const router = useRouter();
  const pathname = usePathname();
  // Remounted after a curtain navigation: start closed, then open.
  const [curtain, setCurtain] = useState<Curtain>(() => (useVitrineUi.getState().navPending ? "cover" : "idle"));
  const safety = useRef(0);
  const lastPath = useRef(pathname);
  const rootRef = useRef<HTMLDivElement>(null);

  /* Cart hydration */
  useEffect(() => {
    void cart.persist.rehydrate();
    const name = cart.persist.getOptions().name;
    const onStorage = (event: StorageEvent) => {
      if (event.key === name) void cart.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [cart]);

  /* Motion level on the root (CSS switches: tilt off, animations shortened…) */
  useEffect(() => {
    const root = rootRef.current?.closest<HTMLElement>(".vt");
    if (root) root.dataset.motion = motion;
  }, [motion]);

  /* Smooth scroll */
  useEffect(() => {
    if (motion !== "full") return;
    const lenis = new Lenis({ autoRaf: false, lerp: 0.1, smoothWheel: true, syncTouch: false });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    useVitrineUi.getState().setLenis(lenis);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      useVitrineUi.getState().setLenis(null);
    };
  }, [motion]);

  /* Reveals (re-scanned on every page) */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets = root.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)");
    if (motion === "none") {
      targets.forEach((t) => t.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [pathname, motion]);

  /* Curtain: intercept internal links */
  useEffect(() => {
    if (motion !== "full") return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor || !rootRef.current?.contains(anchor)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download") || anchor.dataset.noTransition !== undefined) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const here = window.location;
      if (url.pathname === here.pathname && url.search === here.search) return; // same page / hash link
      event.preventDefault();
      const ui = useVitrineUi.getState();
      ui.setCartOpen(false);
      ui.setMenuOpen(false);
      ui.setNavPending(true);
      setCurtain("cover");
      window.setTimeout(() => router.push(url.pathname + url.search + url.hash, { scroll: false }), COVER_MS);
      window.clearTimeout(safety.current);
      safety.current = window.setTimeout(() => {
        if (useVitrineUi.getState().navPending) {
          useVitrineUi.getState().setNavPending(false);
          setCurtain("reveal");
        }
      }, 6000);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [motion, router]);

  /* New page rendered (same shell or a remounted one) → top, refresh triggers, open the curtain. */
  useEffect(() => {
    const ui = useVitrineUi.getState();
    const changed = lastPath.current !== pathname;
    lastPath.current = pathname;
    if (!changed && !ui.navPending) return;
    const lenis = ui.lenis;
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
    requestAnimationFrame(() => ScrollTrigger.refresh());
    if (ui.navPending) {
      ui.setNavPending(false);
      window.clearTimeout(safety.current);
      // Not cleared on cleanup: in Strict Mode the effect runs twice and the
      // second run no longer sees navPending.
      window.setTimeout(() => setCurtain("reveal"), 80);
    }
    const target = document.querySelector<HTMLElement>(".vt main h1");
    if (target) {
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  }, [pathname]);

  useEffect(() => {
    if (curtain !== "reveal") return;
    const id = window.setTimeout(() => setCurtain("idle"), 700);
    return () => window.clearTimeout(id);
  }, [curtain]);

  return (
    <div ref={rootRef} className="contents">
      {children}
      <div aria-hidden className="vt-curtain" data-state={curtain} style={curtain === "idle" ? { transition: "none" } : undefined}>
        <span className="vt-curtain__mark">{shopName}</span>
      </div>
    </div>
  );
}
