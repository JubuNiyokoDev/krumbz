"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import Image from "next/image";
import { ArrowRightIcon } from "@/components/ui/Icons";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import markWhite from "../../../public/brand/rundinova-mark-white.png";
import { displayHost } from "../format";
import type { MarketingShop } from "../types";
import { ShopImage } from "./ShopImage";

export interface PartnerCarouselText {
  carousel: string;
  prev: string;
  next: string;
  slide: string;
  hint: string;
  visit: string;
  imageAlt: string;
  palette: string;
  yours: { title: string; text: string; cta: string };
}

const AUTO_MS = 4800;
const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));

/** Signed distance of slide i from the (possibly fractional) current position, wrapped to (-n/2, n/2]. */
function offsetOf(i: number, position: number, n: number) {
  let o = (((i - position) % n) + n) % n;
  if (o > n / 2) o -= n;
  return o;
}

/** Depth placement of a slide: the progressive 3D ring (side cards recede, turn and fade). */
function slideStyle(o: number, compact: boolean): CSSProperties {
  const abs = Math.abs(o);
  const spread = compact ? 74 : 64;
  return {
    transform: `translateX(calc(-50% + ${o * spread}%)) translateZ(${-abs * (compact ? 180 : 260)}px) rotateY(${Math.max(-62, Math.min(62, -o * 34))}deg) scale(${1 - Math.min(abs, 3) * 0.05})`,
    opacity: abs > 2.4 ? 0 : 1 - abs * 0.16,
    zIndex: 100 - Math.round(abs * 10),
  };
}

function ShopCard({ shop, t, active }: { shop: MarketingShop; t: PartnerCarouselText; active: boolean }) {
  const colors = shop.colors ?? { background: "#ffffff", primary: "#0008b8", accent: "#08b8f0" };
  return (
    <article className="rn-slide-card relative">
      <div className="relative aspect-[4/3] overflow-hidden" style={{ background: colors.primary }}>
        <ShopImage src={shop.imageUrl} alt={fill(t.imageAlt, { name: shop.name })} sizes="(max-width: 640px) 80vw, 420px" className="object-cover" fallbackLabel={shop.name} />
        <div aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 45%, ${colors.primary}e6 100%)` }} />
        <div aria-hidden className="rn-slide-shine pointer-events-none absolute inset-0" />
        <span className="absolute left-4 top-4 grid h-14 w-14 place-items-center overflow-hidden rounded-2xl p-1.5 shadow-[0_12px_24px_-10px_rgb(0_0_0/0.5)]" style={{ background: colors.background }}>
          {shop.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- shop logo (upload or app icon), any format
            <img src={shop.logoUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xl font-extrabold" style={{ color: colors.primary }}>
              {Array.from(shop.name.trim())[0]?.toUpperCase()}
            </span>
          )}
        </span>
        <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-[0.7rem] font-bold text-black backdrop-blur">{displayHost(shop.url)}</span>
      </div>
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[1.45rem] font-extrabold leading-tight tracking-tight">{shop.name}</h3>
          <span className="mt-1.5 flex shrink-0 gap-1" role="img" aria-label={t.palette}>
            {[colors.primary, colors.accent, colors.background].map((color, i) => (
              <span key={i} className="h-4 w-4 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]" style={{ background: color }} />
            ))}
          </span>
        </div>
        {shop.tagline ? <p className="mt-2 line-clamp-2 min-h-[2.8em] text-[0.92rem] leading-snug text-rn-gray">{shop.tagline}</p> : <p className="mt-2 min-h-[2.8em]" />}
        <a
          href={shop.url}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={active ? undefined : -1}
          className="rn-btn mt-5 w-full text-white"
          style={{ background: colors.primary, minHeight: "2.9rem" }}
        >
          {t.visit}
          <ArrowRightIcon size={16} className="-rotate-45" />
        </a>
      </div>
    </article>
  );
}

function YoursCard({ t, active }: { t: PartnerCarouselText; active: boolean }) {
  return (
    <article className="rn-slide-card rn-deep-bg relative flex aspect-[4/5.05] flex-col justify-between p-7 text-white">
      <Image src={markWhite} alt="" aria-hidden sizes="120px" className="h-12 w-auto self-start opacity-90" />
      <div>
        <h3 className="text-[1.9rem] font-extrabold leading-[1.05] tracking-tight">{t.yours.title}</h3>
        <p className="mt-3 text-[0.98rem] leading-relaxed text-rn-ice">{t.yours.text}</p>
        <a href="#vitrine" tabIndex={active ? undefined : -1} className="rn-btn rn-btn-white mt-6 w-full">
          {t.yours.cta}
          <ArrowRightIcon size={16} />
        </a>
      </div>
    </article>
  );
}

/**
 * « Nos boutiques partenaires »: progressive 3D carousel in CSS 3D (perspective + preserve-3d, GPU transforms
 * only). Auto-advances (paused on hover, focus, drag, hidden tab or off-screen), drag / swipe with the pointer,
 * arrow keys and buttons. Reduced motion: a plain horizontal list with scroll snapping, no autoplay.
 */
export function PartnerCarousel({ shops, text: t }: { shops: MarketingShop[]; text: PartnerCarouselText }) {
  const reduced = useReducedMotion();
  const total = shops.length + 1;
  const [position, setPosition] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [compact, setCompact] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; start: number; width: number; moved: boolean; id: number } | null>(null);

  const active = ((Math.round(position) % total) + total) % total;
  const go = useCallback((delta: number) => setPosition((p) => Math.round(p) + delta), []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    const media = window.matchMedia("(max-width: 640px)");
    const onMedia = () => setCompact(media.matches);
    onMedia();
    media.addEventListener("change", onMedia);
    return () => {
      io.disconnect();
      media.removeEventListener("change", onMedia);
    };
  }, []);

  useEffect(() => {
    if (reduced || paused || dragging || !visible || total < 2) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") go(1);
    }, AUTO_MS);
    return () => window.clearInterval(timer);
  }, [reduced, paused, dragging, visible, total, go]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const slide = (event.currentTarget.querySelector("[data-active='true']") as HTMLElement | null)?.offsetWidth ?? 360;
    drag.current = { x: event.clientX, start: position, width: slide * (compact ? 0.74 : 0.64), moved: false, id: event.pointerId };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dx = event.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (d.moved) setPosition(d.start - dx / d.width);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setDragging(false);
    const dx = event.clientX - d.x;
    // A quick flick moves at least one slide.
    setPosition((p) => (Math.abs(p - d.start) < 0.5 && Math.abs(dx) > 30 ? Math.round(d.start) - Math.sign(dx) : Math.round(p)));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    }
  };

  const slides = [...shops.map((shop) => ({ key: shop.url, shop })), { key: "yours", shop: null }];

  if (reduced) {
    return (
      <div role="region" aria-label={t.carousel} className="-mx-5 overflow-x-auto px-5 pb-6 [scroll-snap-type:x_mandatory] sm:-mx-8 sm:px-8">
        <ul className="flex gap-5">
          {slides.map(({ key, shop }, i) => (
            <li key={key} className="w-[min(80vw,24rem)] shrink-0 [scroll-snap-align:center]" aria-label={fill(t.slide, { index: i + 1, total })}>
              {shop ? <ShopCard shop={shop} t={t} active /> : <YoursCard t={t} active />}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      ref={root}
      role="region"
      aria-roledescription="carousel"
      aria-label={t.carousel}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setPaused(false)}
      className="relative outline-none"
    >
      <div
        className="rn-carousel relative mx-auto h-[33rem] touch-pan-y select-none sm:h-[36rem]"
        data-dragging={dragging}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          // A drag never opens a link.
          if (dragging) e.preventDefault();
        }}
      >
        <div className="rn-carousel-track absolute inset-0">
          {slides.map(({ key, shop }, i) => {
            const o = offsetOf(i, position, total);
            const isActive = i === active;
            return (
              <div
                key={key}
                role="group"
                aria-roledescription="slide"
                aria-label={fill(t.slide, { index: i + 1, total })}
                aria-hidden={!isActive}
                data-active={isActive}
                className="rn-slide w-[min(80vw,23rem)] cursor-grab active:cursor-grabbing sm:w-[25rem]"
                style={slideStyle(o, compact)}
                onClick={() => !isActive && setPosition((p) => Math.round(p) + Math.round(o))}
              >
                <div className="rn-reflection">{shop ? <ShopCard shop={shop} t={t} active={isActive} /> : <YoursCard t={t} active={isActive} />}</div>
                <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-black transition-opacity duration-700" style={{ opacity: Math.min(0.55, Math.abs(o) * 0.32) }} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-5">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => go(-1)} aria-label={t.prev} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/25 transition hover:bg-white hover:text-rn-blue">
            <ArrowRightIcon size={18} className="rotate-180" />
          </button>
          <div className="flex items-center gap-2" aria-hidden>
            {slides.map(({ key }, i) => (
              <span key={key} className={`h-2 rounded-full transition-all duration-500 ${i === active ? "w-8 bg-rn-cyan" : "w-2 bg-white/30"}`} />
            ))}
          </div>
          <button type="button" onClick={() => go(1)} aria-label={t.next} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/25 transition hover:bg-white hover:text-rn-blue">
            <ArrowRightIcon size={18} />
          </button>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">{t.hint}</p>
        <p className="sr-only" aria-live={paused ? "polite" : "off"}>
          {fill(t.slide, { index: active + 1, total })} — {slides[active].shop?.name ?? t.yours.title}
        </p>
      </div>
    </div>
  );
}
