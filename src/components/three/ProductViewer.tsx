"use client";

import { useTranslations } from "next-intl";
import { lazy, Suspense, useCallback, useEffect, useId, useRef, useState, type JSX, type KeyboardEvent, type ReactNode } from "react";
import type { TextureMap } from "@/lib/assets/registry";
import { useGlArbiter } from "@/lib/three/glArbiter";
import { useRenderMode, useStaticReason } from "@/store/experience";
import type { ViewerController } from "./ProductViewerCanvas";
import { VIEWER_MODELS, type ViewerModel } from "./poses";

/** WebGL part, fetched only in "3d" mode once the viewer approaches the viewport. */
const ProductViewerCanvas = lazy(() => import("./ProductViewerCanvas"));

const ROTATE_STEP = Math.PI / 8;
const ZOOM_STEP = 0.85;

export interface ProductViewerProps {
  textures: TextureMap;
  initialModel?: ViewerModel;
  /** Still image shown in static/pending mode and while the 3D loads. */
  fallback: ReactNode;
  className?: string;
}

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  left: "M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11",
  right: "m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13",
  zoomIn: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM21 21l-4.35-4.35M11 8v6M8 11h6",
  zoomOut: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM21 21l-4.35-4.35M8 11h6",
  reset: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5",
};

/**
 * Interactive 3D product viewer (Produits page).
 * - "static"/"pending" render mode: shows `fallback` only.
 * - "3d": loads the canvas lazily when the viewer nears the viewport; drag /
 *   touch to rotate, pinch / wheel (when intentional) to zoom, arrows and
 *   + / − on the focused viewer, buttons for every action.
 * - Claims the GPU through the WebGL arbiter: the global ExperienceLayer
 *   releases its context first, so only one context is ever alive.
 */
export function ProductViewer({ textures, initialModel = "sachet", fallback, className = "" }: ProductViewerProps): JSX.Element {
  const t = useTranslations("products");
  const mode = useRenderMode();
  const staticReason = useStaticReason();
  const [model, setModel] = useState<ViewerModel>(initialModel);
  const [nearViewport, setNearViewport] = useState(false);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const controller = useRef<ViewerController | null>(null);
  const [id] = useState(() => Symbol("product-viewer"));
  const owner = useGlArbiter((s) => s.viewer);
  const experienceAlive = useGlArbiter((s) => s.experienceAlive);
  const claimViewer = useGlArbiter((s) => s.claimViewer);
  const releaseViewer = useGlArbiter((s) => s.releaseViewer);
  const hintId = useId();
  const statusId = useId();

  // GPU claim (retried when another viewer releases it)
  useEffect(() => {
    if (mode !== "3d") return;
    if (owner === null) claimViewer(id);
  }, [mode, owner, id, claimViewer]);
  useEffect(() => () => releaseViewer(id), [id, releaseViewer]);

  // Lazy mount near the viewport; pause rendering when scrolled away.
  useEffect(() => {
    const element = wrapper.current;
    if (!element || mode !== "3d") return;
    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNearViewport(true);
      },
      { rootMargin: "300px 0px" },
    );
    const visible = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.01 });
    near.observe(element);
    visible.observe(element);
    return () => {
      near.disconnect();
      visible.disconnect();
    };
  }, [mode]);

  const onReady = useCallback(() => setReady(true), []);
  const owns = owner === id;
  const showCanvas = mode === "3d" && owns && !experienceAlive && nearViewport;

  const names = t.raw("items") as { model?: string; id?: string; name: string }[];
  const labelFor = (m: ViewerModel) =>
    m === "biscuit" ? t("viewer.biscuit") : (names.find((item) => (item.model ?? item.id) === m)?.name ?? t("viewer.biscuit"));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const c = controller.current;
    if (!c) return;
    const handled: Record<string, () => void> = {
      ArrowLeft: () => c.rotate(-ROTATE_STEP),
      ArrowRight: () => c.rotate(ROTATE_STEP),
      ArrowUp: () => c.rotate(0, -ROTATE_STEP / 2),
      ArrowDown: () => c.rotate(0, ROTATE_STEP / 2),
      "+": () => c.zoom(ZOOM_STEP),
      "=": () => c.zoom(ZOOM_STEP),
      "-": () => c.zoom(1 / ZOOM_STEP),
      _: () => c.zoom(1 / ZOOM_STEP),
      "0": () => c.reset(),
      Home: () => c.reset(),
    };
    const action = handled[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const button =
    "inline-flex size-11 items-center justify-center rounded-full bg-cream text-navy shadow-sm ring-1 ring-navy/10 transition hover:bg-gold-light focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rust-bright disabled:opacity-40 motion-reduce:transition-none";

  if (mode !== "3d") {
    return (
      <figure className={`relative ${className}`}>
        {fallback}
        {mode === "static" ? (
          <figcaption className="mt-3 text-center text-sm text-navy/70">
            {t("viewer.staticNotice")}
            {staticReason ? <span className="mt-1 block text-xs text-navy/60">{t(`viewer.reasons.${staticReason}`)}</span> : null}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  const controlsDisabled = !ready;

  return (
    <div ref={wrapper} className={`relative flex flex-col gap-4 ${className}`}>
      <div
        ref={stage}
        tabIndex={0}
        role="application"
        aria-roledescription={t("viewer.label")}
        aria-label={`${t("viewer.label")} : ${labelFor(model)}`}
        aria-describedby={`${hintId} ${statusId}`}
        data-lenis-prevent
        onKeyDown={onKeyDown}
        className="relative aspect-square w-full cursor-grab touch-pan-y overflow-hidden rounded-[var(--radius-blob)] bg-gradient-to-b from-cream to-cream-deep outline-none ring-offset-4 ring-offset-cream transition-shadow focus-visible:ring-4 focus-visible:ring-rust-bright focus:touch-none active:cursor-grabbing"
      >
        <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`} aria-hidden={ready}>
          {fallback}
        </div>
        {showCanvas ? (
          <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
            <Suspense fallback={null}>
              <ProductViewerCanvas textures={textures} model={model} inView={inView} targetRef={stage} controllerRef={controller} onReady={onReady} />
            </Suspense>
          </div>
        ) : null}
        <p id={statusId} role="status" aria-live="polite" className={ready ? "sr-only" : "absolute inset-x-0 bottom-4 text-center text-sm font-semibold text-navy/80"}>
          {ready ? "" : t("viewer.loading")}
        </p>
      </div>

      <p id={hintId} className="text-center text-sm text-navy/70">
        {t("viewer.hint")} <span className="hidden sm:inline">{t("viewer.keyboardHint")}</span>
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <div role="group" aria-label={t("viewer.label")} className="flex flex-wrap justify-center gap-2 rounded-full bg-cream-deep/70 p-1.5">
          {VIEWER_MODELS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={model === m}
              aria-label={t("viewer.show", { name: labelFor(m) })}
              onClick={() => setModel(m)}
              className={`rounded-full px-4 py-2 font-display text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rust-bright motion-reduce:transition-none ${
                model === m ? "bg-navy text-cream shadow" : "text-navy hover:bg-gold-light"
              }`}
            >
              {labelFor(m)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" className={button} disabled={controlsDisabled} aria-label={t("viewer.rotateLeft")} title={t("viewer.rotateLeft")} onClick={() => controller.current?.rotate(-ROTATE_STEP)}>
            <Icon path={ICONS.left} />
          </button>
          <button type="button" className={button} disabled={controlsDisabled} aria-label={t("viewer.rotateRight")} title={t("viewer.rotateRight")} onClick={() => controller.current?.rotate(ROTATE_STEP)}>
            <Icon path={ICONS.right} />
          </button>
          <button type="button" className={button} disabled={controlsDisabled} aria-label={t("viewer.zoomIn")} title={t("viewer.zoomIn")} onClick={() => controller.current?.zoom(ZOOM_STEP)}>
            <Icon path={ICONS.zoomIn} />
          </button>
          <button type="button" className={button} disabled={controlsDisabled} aria-label={t("viewer.zoomOut")} title={t("viewer.zoomOut")} onClick={() => controller.current?.zoom(1 / ZOOM_STEP)}>
            <Icon path={ICONS.zoomOut} />
          </button>
          <button type="button" className={button} disabled={controlsDisabled} aria-label={t("viewer.reset")} title={t("viewer.reset")} onClick={() => controller.current?.reset()}>
            <Icon path={ICONS.reset} />
          </button>
        </div>
      </div>
    </div>
  );
}
