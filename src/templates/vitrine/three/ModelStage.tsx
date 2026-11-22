"use client";

import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useStageMode, useVitrine } from "../lib/context";
import { Icon } from "../components/primitives";
import type { StageControlRef } from "./control";

/** WebGL chunk (three + R3F + drei), fetched only in "3d" mode near the viewport. */
const ModelCanvas = lazy(() => import("./ModelCanvas"));

class CanvasBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export interface ModelStageProps {
  url: string;
  controlRef: StageControlRef;
  /** Still presentation shown in photo mode, while detecting and while the model loads. */
  poster: ReactNode;
  variant?: number | null;
  onVariants?: (names: string[]) => void;
  /** Drag to rotate (pointer), keyboard arrows. */
  interactive?: boolean;
  label: string;
  accent: string;
  className?: string;
  onModeChange?: (mode: "pending" | "3d" | "photo") => void;
  /** Small "drag to rotate" hint in the corner once the model is drawn. */
  showHint?: boolean;
}

/**
 * Gate of the real-time 3D: decides 3D vs photo (tenant flag + device
 * capabilities), mounts the canvas lazily when the stage nears the viewport,
 * pauses rendering off-screen, crossfades from the poster once the model is
 * drawn, and falls back to the poster on any WebGL / loading error.
 */
export function ModelStage({ url, controlRef, poster, variant = null, onVariants, interactive = false, label, accent, className = "", onModeChange, showHint = false }: ModelStageProps) {
  const { ui } = useVitrine();
  const stage = useStageMode();
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number; id: number; moved: boolean } | null>(null);
  const mode = failed ? "photo" : stage.mode;

  useEffect(() => onModeChange?.(mode), [mode, onModeChange]);

  useEffect(() => {
    const el = ref.current;
    if (!el || mode !== "3d") return;
    const nearIo = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "60% 0px" });
    const viewIo = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "10% 0px" });
    nearIo.observe(el);
    viewIo.observe(el);
    return () => {
      nearIo.disconnect();
      viewIo.disconnect();
    };
  }, [mode]);

  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => setFailed(true), []);

  const show3d = mode === "3d" && near;
  const grab = show3d && interactive;

  return (
    <div
      ref={ref}
      className={`vt-stage ${className}`}
      data-grab={grab}
      data-mode={mode}
      data-reason={failed ? "webgl-error" : stage.reason}
      role={grab ? "img" : undefined}
      aria-label={grab ? `${label} — ${ui.dragHint}` : undefined}
      tabIndex={grab ? 0 : undefined}
      onKeyDown={(e) => {
        if (!grab) return;
        if (e.key === "ArrowLeft") controlRef.current.userYaw -= Math.PI / 8;
        else if (e.key === "ArrowRight") controlRef.current.userYaw += Math.PI / 8;
        else return;
        e.preventDefault();
        controlRef.current.autoRotate = false;
        controlRef.current.invalidate();
      }}
      onPointerDown={(e) => {
        if (!grab || e.button !== 0) return;
        drag.current = { x: e.clientX, y: e.clientY, yaw: controlRef.current.userYaw, pitch: controlRef.current.userPitch, id: e.pointerId, moved: false };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.moved) {
          // Vertical swipes keep scrolling the page (touch-action: pan-y).
          if (Math.abs(dx) < 6 || (e.pointerType !== "mouse" && Math.abs(dy) > Math.abs(dx))) return;
          d.moved = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          controlRef.current.autoRotate = false;
        }
        const width = e.currentTarget.clientWidth || 400;
        controlRef.current.userYaw = d.yaw + (dx / width) * Math.PI * 1.6;
        controlRef.current.userPitch = Math.max(-0.5, Math.min(0.6, d.pitch + (dy / width) * Math.PI * 0.6));
        controlRef.current.invalidate();
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <div className="vt-stage__poster" data-hidden={show3d && ready}>
        {poster}
      </div>
      {show3d && (
        <div className="vt-stage__canvas" data-ready={ready}>
          <CanvasBoundary onError={onError}>
            <Suspense fallback={null}>
              <ModelCanvas url={url} controlRef={controlRef} variant={variant} maxDpr={stage.maxDpr} active={inView} accent={accent} onVariants={onVariants} onReady={onReady} />
            </Suspense>
          </CanvasBoundary>
        </div>
      )}
      {grab && ready && showHint && (
        <p className="vt-muted pointer-events-none absolute right-2 top-2 hidden items-center gap-1.5 text-xs font-semibold sm:flex">
          <Icon name="rotate" className="size-4" />
          {ui.dragHint}
        </p>
      )}
      {show3d && !ready && (
        <p className="vt-chip absolute bottom-3 left-1/2 -translate-x-1/2 text-xs" role="status">
          {ui.loading3d}
        </p>
      )}
    </div>
  );
}
