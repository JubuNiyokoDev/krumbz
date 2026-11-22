"use client";

import { useState, type ReactNode } from "react";
import { whatsappUrl } from "@/lib/order/whatsapp";
import { useStageMode, useVitrine } from "../lib/context";
import { fill } from "../lib/i18n";
import { useStageControl } from "../three/control";
import { ModelStage } from "../three/ModelStage";
import { AddToCart } from "./AddToCart";
import { Parallax } from "./Parallax";
import { Relief } from "./Relief";
import { Icon, Img, WhatsAppIcon } from "./primitives";
import { Stepper } from "./Stepper";

export interface BuyProduct {
  id: string;
  name: string;
  modelUrl: string | null;
  images: { url: string; alt: string; width: number; height: number }[];
}

/**
 * Product page "stage + buy box": 3D viewer (when the product has a model and
 * the device can run it) or an immersive photo gallery (relief card with
 * pointer/gyro light, parallax halo, thumbnails, swipe and keyboard), then
 * quantity, colour variants of the glTF and add-to-cart.
 */
export function ProductBuy({ product, accent, info, children }: { product: BuyProduct; accent: string; info: ReactNode; children?: ReactNode }) {
  const { ui, whatsapp, shopName } = useVitrine();
  const stage = useStageMode();
  const has3d = Boolean(product.modelUrl) && stage.mode !== "photo";
  const [tab, setTab] = useState<"3d" | "photos">("3d");
  const [active, setActive] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [variants, setVariants] = useState<string[]>([]);
  const [variant, setVariant] = useState<number | null>(null);
  const controlRef = useStageControl({ yaw: -0.5, pitch: 0.15, autoRotate: true });
  const [swipe, setSwipe] = useState<{ x: number; id: number } | null>(null);

  const showing3d = has3d && tab === "3d";
  const images = product.images;
  const count = images.length;
  const go = (i: number) => count > 0 && setActive(((i % count) + count) % count);
  const option = showing3d && variants.length > 1 ? variants[variant ?? 0] : null;

  const rotate = (delta: number) => {
    controlRef.current.autoRotate = false;
    controlRef.current.userYaw += delta;
    controlRef.current.invalidate();
  };
  const reset = () => {
    controlRef.current.userYaw = 0;
    controlRef.current.userPitch = 0;
    controlRef.current.invalidate();
  };

  const photoStage = (
    <Parallax className="relative size-full">
      <div aria-hidden className="vt-hero__halo vt-par !inset-[14%_10%]" style={{ ["--depth" as string]: -10 }} />
      <div
        className="vt-par absolute inset-0"
        style={{ ["--depth" as string]: 8, touchAction: "pan-y" }}
        onPointerDown={(e) => e.pointerType !== "mouse" && setSwipe({ x: e.clientX, id: e.pointerId })}
        onPointerUp={(e) => {
          if (swipe && swipe.id === e.pointerId && Math.abs(e.clientX - swipe.x) > 40) go(active + (e.clientX < swipe.x ? 1 : -1));
          setSwipe(null);
        }}
      >
        <Relief className="size-full" max={9}>
          <div className="vt-relief__media absolute inset-[7%]">
            {images.map((img, i) => (
              <Img
                key={img.url}
                src={img.url}
                alt={i === active ? img.alt : ""}
                aria-hidden={i !== active}
                width={img.width}
                height={img.height}
                priority={i === 0}
                className="absolute inset-0 size-full object-contain transition-[opacity,transform] duration-700"
                style={{ opacity: i === active ? 1 : 0, transform: i === active ? "none" : `translateX(${i < active ? -6 : 6}%) scale(0.94)` }}
                data-fly-source={i === active ? "" : undefined}
              />
            ))}
          </div>
        </Relief>
      </div>
      {count > 1 && (
        <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between">
          <button type="button" className="vt-icon-btn" onClick={() => go(active - 1)} aria-label={ui.previous}>
            <Icon name="left" />
          </button>
          <button type="button" className="vt-icon-btn" onClick={() => go(active + 1)} aria-label={ui.next}>
            <Icon name="right" />
          </button>
        </div>
      )}
    </Parallax>
  );

  const poster = (
    <Relief className="size-full" max={6}>
      <div className="vt-relief__media absolute inset-[7%]">
        {images[0] && <Img src={images[0].url} alt={images[0].alt} priority className="size-full object-contain" data-fly-source="" />}
      </div>
    </Relief>
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14" data-product-scope>
      <div className="grid content-start gap-4 lg:sticky lg:top-[calc(var(--vt-header-h)+1rem)]">
        <div
          className="vt-gallery__main"
          role="region"
          aria-roledescription={showing3d ? undefined : "carousel"}
          aria-label={showing3d ? `${product.name} — ${ui.view3d}` : `${product.name} — ${ui.gallery}`}
          tabIndex={showing3d ? undefined : 0}
          onKeyDown={(e) => {
            if (showing3d) return;
            if (e.key === "ArrowRight") go(active + 1);
            if (e.key === "ArrowLeft") go(active - 1);
          }}
        >
          {showing3d ? (
            <ModelStage
              url={product.modelUrl as string}
              controlRef={controlRef}
              poster={poster}
              variant={variant}
              onVariants={setVariants}
              interactive
              label={product.name}
              accent={accent}
            />
          ) : (
            photoStage
          )}
          {showing3d && (
            <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
              <button type="button" className="vt-icon-btn" onClick={() => rotate(-Math.PI / 4)} aria-label={ui.rotateLeft}>
                <Icon name="left" />
              </button>
              <button type="button" className="vt-icon-btn" onClick={reset} aria-label={ui.resetView}>
                <Icon name="rotate" />
              </button>
              <button type="button" className="vt-icon-btn" onClick={() => rotate(Math.PI / 4)} aria-label={ui.rotateRight}>
                <Icon name="right" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {has3d ? (
            <div className="vt-tabs" role="tablist" aria-label={ui.gallery}>
              <button type="button" role="tab" aria-selected={tab === "3d"} onClick={() => setTab("3d")}>
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="cube" className="size-4" /> {ui.view3d}
                </span>
              </button>
              <button type="button" role="tab" aria-selected={tab === "photos"} onClick={() => setTab("photos")}>
                {ui.photos}
              </button>
            </div>
          ) : (
            <span />
          )}
          {showing3d ? (
            <span className="vt-muted inline-flex items-center gap-1.5 text-sm font-semibold">
              <Icon name="rotate" className="size-4" /> {ui.dragHint}
            </span>
          ) : (
            count > 1 && (
              <span className="vt-muted text-sm font-semibold" aria-live="polite">
                {fill(ui.slideOf, { n: active + 1, total: count })}
              </span>
            )
          )}
        </div>

        {!showing3d && count > 1 && (
          <div className="vt-thumbs" role="group" aria-label={ui.gallery}>
            {images.map((img, i) => (
              <button key={img.url} type="button" onClick={() => go(i)} aria-current={i === active} aria-label={`${img.alt} — ${fill(ui.slideOf, { n: i + 1, total: count })}`}>
                <Img src={img.url} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid content-start gap-7">
        {info}

        {showing3d && variants.length > 1 && (
          <div className="grid gap-2.5">
            <span className="text-sm font-bold">
              {ui.colors} : <span className="capitalize">{variants[variant ?? 0]}</span>
            </span>
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

        <div className="flex flex-wrap items-center gap-3">
          <Stepper value={quantity} onChange={setQuantity} label={product.name} />
          <AddToCart productId={product.id} quantity={quantity} option={option} className="flex-1 sm:flex-none" />
        </div>
        <a
          href={whatsappUrl(whatsapp, `${shopName} — ${product.name}${option ? ` (${option})` : ""}`)}
          className="vt-btn vt-btn--ghost vt-btn--sm w-fit"
          target="_blank"
          rel="noopener noreferrer"
        >
          <WhatsAppIcon /> {ui.writeUs}
        </a>

        {children}
      </div>
    </div>
  );
}
