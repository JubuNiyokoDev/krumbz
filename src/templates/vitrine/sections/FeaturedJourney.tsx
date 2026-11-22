"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionLevel, useVitrine } from "../lib/context";
import { AddToCart } from "../components/AddToCart";
import { Relief } from "../components/Relief";
import { Icon, Img, Price } from "../components/primitives";
import { ModelStage } from "../three/ModelStage";
import { useStageControl } from "../three/control";

gsap.registerPlugin(ScrollTrigger);

export interface JourneyProduct {
  id: string;
  name: string;
  short: string;
  href: string;
  price: number | null;
  compareAtPrice: number | null;
  modelUrl: string | null;
  images: { url: string; alt: string }[];
}

/** Camera-facing poses of the model, one per chapter (looped if more chapters). */
const POSES = [
  { yaw: -0.6, pitch: 0.12, lift: 0, scale: 1 },
  { yaw: 1.2, pitch: 0.42, lift: 0.08, scale: 1.08 },
  { yaw: 2.75, pitch: 0.05, lift: 0, scale: 1.12 },
  { yaw: 4.4, pitch: 0.18, lift: 0.05, scale: 1 },
];
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Featured product journey: a sticky stage while the visitor scrolls through
 * chapters. 3D: the model turns / tilts / zooms with the scroll (damped, on
 * demand rendering) and can be dragged; colour variants of the glTF are
 * offered as chips. Photo mode: the product photos crossfade in a relief card.
 */
export function FeaturedJourney({
  product,
  chapters,
  heading,
  accent,
}: {
  product: JourneyProduct;
  chapters: { title: string; text: string }[];
  heading: { eyebrow: string; title: string; text?: string };
  accent: string;
}) {
  const { ui } = useVitrine();
  const motion = useMotionLevel();
  const track = useRef<HTMLDivElement>(null);
  const controlRef = useStageControl({ yaw: POSES[0].yaw, pitch: POSES[0].pitch });
  const [chapter, setChapter] = useState(0);
  const [variants, setVariants] = useState<string[]>([]);
  const [variant, setVariant] = useState<number | null>(null);
  const scrubbed = motion === "full";

  useEffect(() => {
    const el = track.current;
    if (!el || !scrubbed) return;
    const n = chapters.length;
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const p = self.progress;
        el.style.setProperty("--p", p.toFixed(4));
        setChapter(Math.min(n - 1, Math.floor(p * n * 0.9999)));
        const x = p * (n - 1);
        const i = Math.floor(x);
        const a = POSES[i % POSES.length];
        const b = POSES[Math.min(i + 1, n - 1) % POSES.length];
        const t = smooth(x - i);
        controlRef.current.yaw = a.yaw + (b.yaw - a.yaw) * t;
        controlRef.current.pitch = a.pitch + (b.pitch - a.pitch) * t;
        controlRef.current.lift = a.lift + (b.lift - a.lift) * t;
        controlRef.current.scale = a.scale + (b.scale - a.scale) * t;
        controlRef.current.invalidate();
      },
    });
    return () => trigger.kill();
  }, [scrubbed, chapters.length, controlRef]);

  const photo = product.images[chapter % Math.max(1, product.images.length)] ?? product.images[0];
  const poster = (
    <Relief className="size-full" max={7}>
      <div className="vt-relief__media absolute inset-[6%]">
        {product.images.map((img, i) => (
          <Img
            key={img.url}
            src={img.url}
            alt={i === 0 ? img.alt : ""}
            className="absolute inset-0 size-full object-contain transition-[opacity,transform] duration-700"
            style={{ opacity: img === photo ? 1 : 0, transform: img === photo ? "none" : "scale(0.94)" }}
            data-fly-source={img === photo ? "" : undefined}
          />
        ))}
      </div>
    </Relief>
  );

  const details = (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Price price={product.price} compareAt={product.compareAtPrice} onRequest={ui.priceOnRequest} className="text-2xl" />
      </div>
      {variants.length > 1 && (
        <div className="grid gap-2">
          <span className="text-sm font-bold">{ui.colors}</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label={ui.colors}>
            {variants.map((name, i) => (
              <button
                key={name}
                type="button"
                className="vt-chip cursor-pointer capitalize"
                aria-pressed={(variant ?? 0) === i}
                style={(variant ?? 0) === i ? { background: "var(--vt-text)", color: "var(--vt-bg)" } : undefined}
                onClick={() => setVariant(i)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <AddToCart productId={product.id} option={variants.length > 1 ? variants[variant ?? 0] : null} />
        <Link href={product.href} className="vt-btn vt-btn--ghost">
          {ui.viewProduct} <Icon name="arrow" className="vt-arrow size-5" />
        </Link>
      </div>
    </div>
  );

  const stage = product.modelUrl ? (
    <ModelStage
      url={product.modelUrl}
      controlRef={controlRef}
      poster={poster}
      variant={variant}
      onVariants={setVariants}
      interactive
      showHint
      label={product.name}
      accent={accent}
    />
  ) : (
    poster
  );

  if (!scrubbed) {
    return (
      <section className="vt-section" aria-labelledby="vt-journey-title" data-product-scope>
        <div className="vt-wrap grid items-center gap-10 lg:grid-cols-2">
          <div className="vt-journey__stage" data-reveal="fade">
            {stage}
          </div>
          <div className="grid gap-6" data-reveal>
            <p className="vt-eyebrow">{heading.eyebrow}</p>
            <h2 id="vt-journey-title" className="vt-h2">
              {heading.title || product.name}
            </h2>
            <p className="vt-lead">{heading.text || product.short}</p>
            <ol className="grid gap-4">
              {chapters.map((c, i) => (
                <li key={c.title} className="grid gap-1">
                  <span className="vt-h3">
                    <span className="vt-accent-text">{String(i + 1).padStart(2, "0")}</span> {c.title}
                  </span>
                  <span className="vt-muted">{c.text}</span>
                </li>
              ))}
            </ol>
            {details}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="vt-journey" aria-labelledby="vt-journey-title" data-product-scope>
      <div ref={track} style={{ height: `${chapters.length * 90 + 60}svh` }}>
        <div className="vt-journey__sticky">
          <div className="vt-wrap grid items-center gap-6 pt-[var(--vt-header-h)] lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
            <div className="order-2 grid gap-5 lg:order-1">
              <div className="grid gap-3">
                <p className="vt-eyebrow">{heading.eyebrow}</p>
                <h2 id="vt-journey-title" className="vt-h2 !text-[clamp(1.9rem,4.4vw,3.8rem)]">
                  {heading.title || product.name}
                </h2>
              </div>
              <div className="grid">
                {chapters.map((c, i) => (
                  <div key={c.title} className="vt-journey__chapter col-start-1 row-start-1 grid content-start gap-2" data-on={i === chapter} aria-hidden={i !== chapter}>
                    <div className="flex items-baseline gap-4">
                      <span className="vt-journey__num hidden sm:block" aria-hidden>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="grid gap-1.5">
                        <h3 className="vt-h3">{c.title}</h3>
                        <p className="vt-muted max-w-md">{c.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {details}
            </div>
            <div className="vt-journey__stage order-1 lg:order-2">
              <div aria-hidden className="vt-hero__halo !inset-[10%] opacity-70" />
              {stage}
            </div>
          </div>
          <div className="vt-journey__progress" aria-hidden>
            <i />
          </div>
        </div>
      </div>
    </section>
  );
}
