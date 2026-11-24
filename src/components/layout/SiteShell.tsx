"use client";

import { useCallback, useEffect, useEffectEvent, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useCart } from "@/store/cart";
import { scrollToTarget, useUi } from "@/hooks/useUi";
import { prefersReducedMotion, useReducedMotion } from "@/hooks/useReducedMotion";
import { BrandMark } from "@/components/ui/BrandMark";
import { CartDrawer } from "./CartDrawer";
import { MobileMenu } from "./MobileMenu";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export const PAGE_CHANGE_EVENT = "krumbz:pagechange";

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function headerOffset() {
  return -(document.querySelector<HTMLElement>(".site-header")?.offsetHeight ?? 0);
}

/** Moves focus to the new page's h1 (or main) without scrolling. */
function focusPage() {
  const target = document.querySelector<HTMLElement>("main h1") ?? document.getElementById("contenu");
  if (!target) return;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

/**
 * Client shell: smooth scroll (Lenis ↔ GSAP ScrollTrigger), page transitions
 * (golden doors closing then opening on internal navigations), scroll reveals,
 * cart hydration, cart drawer and mobile menu.
 *
 * Page transition: internal link clicks are intercepted (capture phase), the
 * doors close, the router navigates, we wait for the new pathname, scroll to
 * top, refresh ScrollTrigger, open the doors, then dispatch `krumbz:pagechange`
 * (listened to by the WebGL layer) and move focus to the new h1. Next.js'
 * built-in route announcer reads the new document title to screen readers.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const curtainRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<{ path: string; resolve: () => void } | null>(null);
  const busyRef = useRef(false);
  const lastPath = useRef(pathname);

  /* ---------- Cart hydration (+ sync between tabs) ---------- */
  useEffect(() => {
    void useCart.persist.rehydrate();
    const onStorage = (event: StorageEvent) => {
      if (event.key === useCart.persist.getOptions().name) void useCart.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* ---------- Smooth scroll ---------- */
  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ autoRaf: false, lerp: 0.11, smoothWheel: true, syncTouch: false });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    useUi.getState().setLenis(lenis);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      useUi.getState().setLenis(null);
    };
  }, [reduced]);

  /* ---------- Page transition ---------- */
  const playClose = useCallback(async () => {
    const el = curtainRef.current;
    if (!el) return;
    el.dataset.active = "true";
    const fade = el.querySelector(".curtain-fade");
    if (prefersReducedMotion()) {
      await gsap.fromTo(fade, { opacity: 0 }, { opacity: 1, duration: 0.18, ease: "none" });
      return;
    }
    gsap.set(fade, { opacity: 0 });
    const doors = el.querySelectorAll("[data-door]");
    const mark = el.querySelector(".curtain-mark");
    await gsap
      .timeline()
      .fromTo(doors, { scaleX: 0 }, { scaleX: 1, duration: 0.62, ease: "expo.inOut" })
      .fromTo(mark, { scale: 0, rotate: -140 }, { scale: 1, rotate: 0, duration: 0.55, ease: "back.out(2.2)" }, "-=0.28");
  }, []);

  const playOpen = useCallback(async () => {
    const el = curtainRef.current;
    if (!el) return;
    const fade = el.querySelector(".curtain-fade");
    if (prefersReducedMotion()) {
      await gsap.to(fade, { opacity: 0, duration: 0.22, ease: "none" });
    } else {
      const doors = el.querySelectorAll("[data-door]");
      const mark = el.querySelector(".curtain-mark");
      gsap.killTweensOf(mark);
      await gsap
        .timeline()
        .to(mark, { scale: 0, rotate: "+=160", duration: 0.42, ease: "back.in(2)" })
        .to(doors, { scaleX: 0, duration: 0.75, ease: "expo.inOut" }, "-=0.12");
    }
    el.dataset.active = "false";
  }, []);

  const navigate = useCallback(
    async (href: string) => {
      if (busyRef.current) return;
      const url = new URL(href, window.location.href);
      busyRef.current = true;
      const ui = useUi.getState();
      ui.setMenuOpen(false);
      ui.setCartOpen(false);
      try {
        router.prefetch(url.pathname);
        await playClose();
        // Waiting state: the biscuit keeps turning while the next page loads.
        const mark = curtainRef.current?.querySelector(".curtain-mark");
        const spin = prefersReducedMotion() ? null : gsap.to(mark ?? [], { rotate: "+=360", duration: 2.2, ease: "none", repeat: -1, delay: 0.25 });
        const arrived = new Promise<void>((resolve) => {
          pendingRef.current = { path: url.pathname, resolve };
        });
        router.push(url.pathname + url.search + url.hash, { scroll: false });
        await Promise.race([arrived, wait(8000)]);
        pendingRef.current = null;
        // Wait for the new page heading (streaming / slow networks), max 2 s.
        for (let i = 0; i < 40 && !document.querySelector("main h1"); i++) await wait(50);
        await nextFrame();
        useUi.getState().lenis?.scrollTo(0, { immediate: true, force: true });
        window.scrollTo(0, 0);
        await nextFrame();
        ScrollTrigger.refresh();
        spin?.kill();
        await playOpen();
        window.dispatchEvent(new CustomEvent(PAGE_CHANGE_EVENT));
        // Links with an anchor (e.g. /commander#etape-2) land on that section, not on the top of the page.
        const hashTarget = url.hash ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
        if (hashTarget) {
          scrollToTarget(hashTarget, headerOffset());
          if (!hashTarget.hasAttribute("tabindex")) hashTarget.setAttribute("tabindex", "-1");
          hashTarget.focus({ preventScroll: true });
        } else {
          focusPage();
        }
      } finally {
        pendingRef.current = null;
        busyRef.current = false;
        if (curtainRef.current) curtainRef.current.dataset.active = "false";
      }
    },
    [router, playClose, playOpen],
  );

  useEffect(() => {
    const go = (href: string) => void navigate(href);
    useUi.getState().setNavigate(go);
    return () => useUi.getState().setNavigate(null);
  }, [navigate]);

  /* Internal link interception (capture phase, before Next's <Link> handler, which then skips). */
  const onDocumentClick = useEffectEvent((event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
    if (!anchor) return;
    if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download") || anchor.dataset.transition === "off") return;
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin || !/^https?:$/.test(url.protocol)) return;
    if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) return; // files
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
      event.preventDefault();
      const id = decodeURIComponent(url.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      const ui = useUi.getState();
      // A link inside the cart drawer or the mobile menu closes it first (e.g. « Finaliser la commande »
      // while already on /commander); scrolling waits for the dialog's scroll lock to be released.
      const hadDialog = ui.cartOpen || ui.menuOpen;
      ui.setMenuOpen(false);
      ui.setCartOpen(false);
      const go = () => {
        if (target) {
          scrollToTarget(target, target.id === "contenu" ? 0 : headerOffset());
          if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        } else {
          scrollToTarget(0);
        }
      };
      if (hadDialog) window.setTimeout(go, 80);
      else go();
      return;
    }
    event.preventDefault();
    void navigate(url.href);
  });

  useEffect(() => {
    const listener = (event: MouseEvent) => onDocumentClick(event);
    window.addEventListener("click", listener, true);
    return () => window.removeEventListener("click", listener, true);
  }, []);

  /* Pathname changes: resolve a pending transition, or handle back/forward. */
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    const pending = pendingRef.current;
    if (pending) {
      if (decodeURI(pathname) === decodeURI(pending.path)) pending.resolve();
      return;
    }
    if (busyRef.current) return;
    const frame = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      window.dispatchEvent(new CustomEvent(PAGE_CHANGE_EVENT));
      focusPage();
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  /* ---------- Scroll reveals ([data-reveal] → [data-inview]) ---------- */
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-inview])"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.inview = "";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.01 },
    );
    const vh = window.innerHeight;
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (!busyRef.current && rect.top < vh && rect.bottom > 0) el.dataset.inview = "";
      else observer.observe(el);
    }
    document.documentElement.classList.add("reveal-ready");
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <>
      <div data-app-content>{children}</div>
      <CartDrawer />
      <MobileMenu />
      <div ref={curtainRef} className="page-curtain" data-active="false" aria-hidden>
        <div className="curtain-fade" />
        <div className="curtain-door" data-door="left" />
        <div className="curtain-door" data-door="right" />
        <div className="curtain-mark">
          <BrandMark className="h-full w-full drop-shadow-[0_14px_24px_rgb(164_80_26/0.45)]" />
        </div>
      </div>
    </>
  );
}
