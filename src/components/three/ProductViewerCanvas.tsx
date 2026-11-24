"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { addAfterEffect, Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { NeutralToneMapping, type Group } from "three";
import type { TextureMap } from "@/lib/assets/registry";
import { KRUMBZ_KIT, type StorefrontKit } from "@/lib/storefront/kit";
import { qualityFor, type ProductAssets } from "@/lib/three/assets";
import { createGenericViewerAssets, type GenericViewerAssets } from "@/lib/three/generic";
import { installThreeConsoleFilter } from "@/lib/three/console";
import type { BrandTexts } from "@/lib/three/labels";
import { useExperience } from "@/store/experience";
import { BiscuitModel, CartonModel, SachetModel, setSachetOpen, StudioLights } from "./models";
import type { ViewerModel } from "./poses";
import { useSoftShadows, type ShadowCaster } from "./softShadows";
import { useGenericAssets } from "./useGenericAssets";
import { useProductAssets } from "./useProductAssets";

installThreeConsoleFilter();

/** Imperative commands used by the HTML buttons and the keyboard. */
export interface ViewerController {
  rotate: (yaw: number, pitch?: number) => void;
  zoom: (factor: number) => void;
  reset: () => void;
}

export interface ProductViewerCanvasProps {
  textures: TextureMap;
  /** Krumbz: a ViewerModel; other shops: a product id (src/lib/three/generic.ts viewerProducts). */
  model: ViewerModel | string;
  /** Shop kit: Krumbz = bespoke procedural products (default). */
  kit?: StorefrontKit;
  /** False when scrolled out of view: the loop stops entirely. */
  inView: boolean;
  /** Element receiving drag / pinch / wheel (the focusable wrapper). */
  targetRef: RefObject<HTMLElement | null>;
  controllerRef: RefObject<ViewerController | null>;
  onReady: () => void;
}

const DISTANCE = 4.3;
const MIN_DISTANCE = 2.6;
const MAX_DISTANCE = 6.6;
const PITCH_LIMIT = 0.7;
const AUTO_ROTATE_SPEED = 0.22;
const AUTO_ROTATE_DELAY = 6000;
const HOVER_INTENT_MS = 600;
const REST_YAW = 0.35;

/** Display scale per model (fits the default framing). */
const MODEL_SCALE: Record<ViewerModel, number> = { sachet: 1.15, carton: 1.18, biscuit: 1.55 };
/** Display scale of a shop's product (normalised to a 1.25 box, src/lib/three/generic.ts). */
const GENERIC_SCALE = 1.15;

/** One selectable object of the turntable. */
interface ViewerSlot {
  key: string;
  scale: number;
  radius: number;
  halfHeight: number;
  render: (ref: (node: Group | null) => void) => ReactNode;
}

function bespokeSlots(assets: ProductAssets): ViewerSlot[] {
  return [
    { key: "sachet", scale: MODEL_SCALE.sachet, radius: 0.5, halfHeight: 0.75, render: (ref) => <SachetModel assets={assets} ref={ref} /> },
    { key: "carton", scale: MODEL_SCALE.carton, radius: 0.62, halfHeight: 0.55, render: (ref) => <CartonModel assets={assets} ref={ref} /> },
    {
      key: "biscuit",
      scale: MODEL_SCALE.biscuit,
      radius: 0.5,
      halfHeight: 0.5,
      render: (ref) => (
        <group ref={ref}>
          <group rotation={[Math.PI / 2 - 0.12, 0, 0]}>
            <BiscuitModel assets={assets} />
          </group>
        </group>
      ),
    },
  ];
}

function genericSlots(assets: GenericViewerAssets): ViewerSlot[] {
  return assets.items.map((item) => ({
    key: item.id,
    scale: GENERIC_SCALE,
    radius: item.radius,
    halfHeight: item.halfHeight,
    render: (ref) => (
      <group ref={ref} dispose={null}>
        <primitive object={item.object} dispose={null} />
      </group>
    ),
  }));
}

interface ViewState {
  yaw: number;
  pitch: number;
  distance: number;
  yawTarget: number;
  pitchTarget: number;
  distanceTarget: number;
  velocity: number;
  lastInteraction: number;
  dragging: boolean;
  scales: Record<string, number>;
  spin: Record<string, number>;
}

const damp = (lambda: number, dt: number) => 1 - Math.exp(-lambda * dt);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function ViewerScene({
  slots,
  bespoke,
  model,
  targetRef,
  controllerRef,
  onFirstFrame,
}: {
  slots: ViewerSlot[];
  /** Krumbz: keeps the sachet sealed. */
  bespoke: boolean;
  model: string;
  targetRef: RefObject<HTMLElement | null>;
  controllerRef: RefObject<ViewerController | null>;
  onFirstFrame: () => void;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const turntable = useRef<Group>(null);
  const nodes = useRef<Record<string, Group | null>>({});
  const view = useRef<ViewState | null>(null);
  const [live, setLive] = useState(false);
  const modelRef = useRef(model);
  const shadows = useSoftShadows(slots.length, -1.02, 0.1, 0.55);
  const casters = useRef<ShadowCaster[]>([]);

  useEffect(() => {
    modelRef.current = model;
    const v = view.current;
    if (v) {
      v.spin[model] = -Math.PI * 0.9; // the incoming model spins in…
      // …and lands on the flattering three-quarter view, auto-rotation paused
      v.yawTarget = Math.round((v.yaw - REST_YAW) / (Math.PI * 2)) * Math.PI * 2 + REST_YAW;
      v.pitchTarget = 0.08;
      v.velocity = 0;
      v.lastInteraction = performance.now();
    }
    invalidate();
  }, [model, invalidate]);

  useEffect(() => {
    let cancelled = false;
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) {
          setLive(true);
          invalidate();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, slots, invalidate]);

  useEffect(() => {
    if (!live) return;
    let done = false;
    const unsubscribe = addAfterEffect(() => {
      if (done) return;
      done = true;
      onFirstFrame();
      queueMicrotask(unsubscribe);
    });
    return unsubscribe;
  }, [live, onFirstFrame]);

  // Input: drag to rotate, pinch / wheel to zoom, commands from buttons & keys.
  useEffect(() => {
    const element = targetRef.current;
    const v = (view.current ??= {
      yaw: -0.5,
      pitch: 0.08,
      distance: DISTANCE,
      yawTarget: REST_YAW,
      pitchTarget: 0.08,
      distanceTarget: DISTANCE,
      velocity: 0,
      lastInteraction: 0,
      dragging: false,
      scales: Object.fromEntries(slots.map((slot) => [slot.key, 0])),
      // the first model spins in on load
      spin: Object.fromEntries(slots.map((slot, i) => [slot.key, i === 0 ? -Math.PI * 0.9 : 0])),
    });
    const touch = () => {
      v.lastInteraction = performance.now();
      invalidate();
    };
    controllerRef.current = {
      rotate: (yaw, pitch = 0) => {
        v.yawTarget += yaw;
        v.pitchTarget = clamp(v.pitchTarget + pitch, -PITCH_LIMIT, PITCH_LIMIT);
        touch();
      },
      zoom: (factor) => {
        v.distanceTarget = clamp(v.distanceTarget * factor, MIN_DISTANCE, MAX_DISTANCE);
        touch();
      },
      reset: () => {
        // shortest way back to the default three-quarter view
        v.yawTarget = Math.round((v.yaw - REST_YAW) / (Math.PI * 2)) * Math.PI * 2 + REST_YAW;
        v.pitchTarget = 0.08;
        v.distanceTarget = DISTANCE;
        v.velocity = 0;
        touch();
      },
    };
    if (!element) return;

    const pointers = new Map<number, { x: number; y: number }>();
    let pinchStart = 0;
    let pinchDistance = DISTANCE;
    let lastMove = 0;
    let hoverSince = 0;

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      element.setPointerCapture(event.pointerId);
      v.dragging = true;
      v.velocity = 0;
      if (pointers.size === 2) {
        const [p1, p2] = [...pointers.values()];
        pinchStart = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        pinchDistance = v.distanceTarget;
      }
      touch();
    };
    const onMove = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      const current = { x: event.clientX, y: event.clientY };
      pointers.set(event.pointerId, current);
      if (pointers.size >= 2) {
        const [p1, p2] = [...pointers.values()];
        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (pinchStart > 0) v.distanceTarget = clamp(pinchDistance * (pinchStart / d), MIN_DISTANCE, MAX_DISTANCE);
      } else {
        const width = element.clientWidth || 1;
        const dx = ((current.x - previous.x) / width) * Math.PI * 1.6;
        const dy = ((current.y - previous.y) / width) * Math.PI;
        v.yawTarget += dx;
        v.pitchTarget = clamp(v.pitchTarget + dy, -PITCH_LIMIT, PITCH_LIMIT);
        const now = performance.now();
        const elapsed = Math.max(8, now - lastMove);
        v.velocity = (dx / elapsed) * 1000;
        lastMove = now;
      }
      touch();
    };
    const onUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
      if (pointers.size < 2) pinchStart = 0;
      if (pointers.size === 0) {
        v.dragging = false;
        if (performance.now() - lastMove > 80) v.velocity = 0;
      }
      touch();
    };
    const onEnter = () => {
      hoverSince = performance.now();
    };
    const onLeave = () => {
      hoverSince = 0;
    };
    // Wheel zooms only when intentional: viewer focused, pinch-to-zoom
    // trackpads (ctrlKey), or after resting the pointer on it — otherwise the
    // page scrolls normally.
    const onWheel = (event: WheelEvent) => {
      const intentional =
        document.activeElement === element || event.ctrlKey || (hoverSince > 0 && performance.now() - hoverSince > HOVER_INTENT_MS);
      if (!intentional) {
        hoverSince = performance.now(); // scrolling past: restart the hover timer
        return;
      }
      event.preventDefault();
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      v.distanceTarget = clamp(v.distanceTarget * Math.exp(delta * 0.0016), MIN_DISTANCE, MAX_DISTANCE);
      touch();
    };

    element.addEventListener("pointerdown", onDown);
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerup", onUp);
    element.addEventListener("pointercancel", onUp);
    element.addEventListener("pointerenter", onEnter);
    element.addEventListener("pointerleave", onLeave);
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      element.removeEventListener("pointerdown", onDown);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerup", onUp);
      element.removeEventListener("pointercancel", onUp);
      element.removeEventListener("pointerenter", onEnter);
      element.removeEventListener("pointerleave", onLeave);
      element.removeEventListener("wheel", onWheel);
      controllerRef.current = null;
    };
  }, [targetRef, controllerRef, invalidate, slots]);

  useFrame((state, rawDelta) => {
    const v = view.current;
    const table = turntable.current;
    if (!v || !table || !live) return;
    const dt = Math.min(rawDelta, 1 / 20);
    let moving = false;

    // inertia after a flick
    if (!v.dragging && Math.abs(v.velocity) > 0.01) {
      v.yawTarget += v.velocity * dt;
      v.velocity *= Math.exp(-3.2 * dt);
      moving = true;
    }
    const idleFor = performance.now() - v.lastInteraction;
    const autoRotate = !v.dragging && idleFor > AUTO_ROTATE_DELAY && document.visibilityState === "visible";
    if (autoRotate) v.yawTarget += AUTO_ROTATE_SPEED * dt;

    const f = damp(8, dt);
    v.yaw += (v.yawTarget - v.yaw) * f;
    v.pitch += (v.pitchTarget - v.pitch) * f;
    v.distance += (v.distanceTarget - v.distance) * damp(7, dt);
    if (Math.abs(v.yawTarget - v.yaw) + Math.abs(v.pitchTarget - v.pitch) + Math.abs(v.distanceTarget - v.distance) > 1e-4) moving = true;

    table.rotation.set(v.pitch, v.yaw, 0);
    state.camera.position.set(0, 0.06 * v.distance, v.distance);
    state.camera.lookAt(0, 0, 0);

    const selected = modelRef.current;
    for (const slot of slots) {
      const name = slot.key;
      const node = nodes.current[name];
      if (!node) continue;
      v.scales[name] ??= 0;
      v.spin[name] ??= 0;
      const targetScale = name === selected ? slot.scale : 0;
      const k = damp(name === selected ? 7 : 11, dt);
      v.scales[name] += (targetScale - v.scales[name]) * k;
      v.spin[name] += (0 - v.spin[name]) * damp(5, dt);
      if (Math.abs(targetScale - v.scales[name]) > 1e-4 || Math.abs(v.spin[name]) > 1e-4) moving = true;
      node.scale.setScalar(Math.max(1e-5, v.scales[name]));
      node.rotation.y = v.spin[name];
      node.visible = v.scales[name] > 1e-3;
    }
    if (bespoke) setSachetOpen(nodes.current.sachet ?? null, 0);
    slots.forEach((slot, i) => {
      casters.current[i] ??= { object: null, radius: slot.radius, halfHeight: slot.halfHeight };
      casters.current[i].object = nodes.current[slot.key] ?? null;
    });
    shadows.update(casters.current);

    if (moving || autoRotate) state.invalidate();
  });

  return (
    <>
      <group ref={turntable}>
        {slots.map((slot) => (
          <SlotNode key={slot.key} slot={slot} nodes={nodes} />
        ))}
      </group>
      <primitive object={shadows.group} />
    </>
  );
}

function SlotNode({ slot, nodes }: { slot: ViewerSlot; nodes: RefObject<Record<string, Group | null>> }) {
  return slot.render((node) => {
    nodes.current[slot.key] = node;
  });
}

/** Lazily-loaded WebGL part of ProductViewer (see ProductViewer.tsx). */
export default function ProductViewerCanvas({ textures, model, kit = KRUMBZ_KIT, inView, targetRef, controllerRef, onReady }: ProductViewerCanvasProps) {
  const capabilities = useExperience((s) => s.capabilities);
  const setFailed = useExperience((s) => s.setFailed);
  const t = useTranslations("brand");
  const brand = useMemo<BrandTexts>(
    () => ({ name: t("name"), tagline: t("tagline"), base: t("base"), origin: t("origin"), company: t("company"), promise: t("promise") }),
    [t],
  );
  const maxDpr = capabilities?.maxDpr ?? 1.5;
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, maxDpr));
  const disposing = useRef(false);
  const cleanupContext = useRef<(() => void) | null>(null);

  useEffect(() => {
    disposing.current = false;
    return () => {
      disposing.current = true;
      cleanupContext.current?.();
    };
  }, []);

  return (
    <Canvas
      frameloop={inView ? "demand" : "never"}
      dpr={dpr}
      camera={{ fov: 30, position: [0, 0.25, DISTANCE], near: 0.1, far: 30 }}
      gl={{ antialias: true, alpha: true, stencil: false, powerPreference: "high-performance" }}
      resize={{ scroll: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = NeutralToneMapping;
        gl.toneMappingExposure = 1.02;
        const canvas = gl.domElement;
        const onLost = (event: Event) => {
          if (disposing.current) return;
          event.preventDefault();
          console.warn("[krumbz-3d] contexte WebGL perdu : passage en image fixe.");
          setFailed(true);
        };
        canvas.addEventListener("webglcontextlost", onLost);
        cleanupContext.current = () => canvas.removeEventListener("webglcontextlost", onLost);
      }}
    >
      <PerformanceMonitor
        factor={1}
        flipflops={3}
        onChange={({ factor }) => setDpr(Math.max(1, Math.round((1 + factor * (maxDpr - 1)) * 4) / 4))}
        onFallback={() => setDpr(1)}
      />
      <StudioLights />
      {kit.bespoke ? (
        <ViewerAssets textures={textures} brand={brand} model={model} targetRef={targetRef} controllerRef={controllerRef} onReady={onReady} />
      ) : (
        <GenericViewer kit={kit} model={model} targetRef={targetRef} controllerRef={controllerRef} onReady={onReady} />
      )}
    </Canvas>
  );
}

function ViewerAssets({
  textures,
  brand,
  model,
  targetRef,
  controllerRef,
  onReady,
}: Omit<ProductViewerCanvasProps, "inView"> & { brand: BrandTexts }) {
  const capabilities = useExperience((s) => s.capabilities);
  const setFailed = useExperience((s) => s.setFailed);
  const assets = useProductAssets({
    textures,
    quality: qualityFor(capabilities),
    brand,
    onError: (error) => {
      console.error("[krumbz-3d] visionneuse indisponible", error);
      setFailed(true);
    },
  });
  const slots = useMemo(() => (assets ? bespokeSlots(assets) : null), [assets]);
  if (!slots) return null;
  return <ViewerScene slots={slots} bespoke model={model} targetRef={targetRef} controllerRef={controllerRef} onFirstFrame={onReady} />;
}

/** Any other shop: its products (glTF or photo card) on the same turntable. */
function GenericViewer({
  kit,
  model,
  targetRef,
  controllerRef,
  onReady,
}: Pick<ProductViewerCanvasProps, "model" | "targetRef" | "controllerRef" | "onReady"> & { kit: StorefrontKit }) {
  const setFailed = useExperience((s) => s.setFailed);
  const assets = useGenericAssets({
    products: kit.products,
    create: createGenericViewerAssets,
    onError: (error) => {
      console.error("[3d] visionneuse indisponible", error);
      setFailed(true);
    },
  });
  const slots = useMemo(() => (assets ? genericSlots(assets) : null), [assets]);
  if (!slots) return null;
  return <ViewerScene slots={slots} bespoke={false} model={model} targetRef={targetRef} controllerRef={controllerRef} onFirstFrame={onReady} />;
}
