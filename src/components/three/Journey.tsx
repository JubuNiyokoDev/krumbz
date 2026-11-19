"use client";

import { addAfterEffect, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import { Euler, Quaternion, Vector3, type Group, type PerspectiveCamera } from "three";
import type { StageId } from "@/lib/experience/stages";
import { scanAnchors, type AnchorEntry } from "@/lib/three/anchors";
import type { ProductAssets } from "@/lib/three/assets";
import { BiscuitModel, CartonModel, SachetModel, setSachetOpen } from "./models";
import { useSoftShadows, type ShadowCaster } from "./softShadows";
import { BISCUIT_COUNT, composeStage, type Composition, type ObjectPose } from "./poses";

/** Where on the viewport an anchor is "current" (fraction of the visible height). */
const FOCUS = 0.5;
/** Part of the travel between two anchors during which products stay on the previous/next one. */
const HOLD = 0.16;
const INTRO_SECONDS = 3.6;
const OBJECT_COUNT = 2 + BISCUIT_COUNT;
const SETTLE_EPSILON = 1e-4;

/** Intro auto-play happens once per page load. */
let introPlayed = false;

interface ObjectState {
  pos: Vector3;
  quat: Quaternion;
  scale: number;
}

interface Runtime {
  anchors: AnchorEntry[];
  progress: Map<StageId, number>;
  objects: ObjectState[];
  open: number;
  group: { pos: Vector3; unit: number };
  tilt: { x: number; y: number; tx: number; ty: number };
  time: number;
  intro: number;
  hasIntro: boolean;
  initialised: boolean;
}

function createRuntime(): Runtime {
  return {
    anchors: [],
    progress: new Map(),
    objects: Array.from({ length: OBJECT_COUNT }, () => ({ pos: new Vector3(), quat: new Quaternion(), scale: 0 })),
    open: 0,
    group: { pos: new Vector3(), unit: 1 },
    tilt: { x: 0, y: 0, tx: 0, ty: 0 },
    time: 0,
    intro: introPlayed ? 1 : 0,
    hasIntro: false,
    initialised: false,
  };
}

// scratch objects (no allocation per frame)
const _euler = new Euler(0, 0, 0, "ZXY");
const _qa = new Quaternion();
const _qb = new Quaternion();
const _qIdle = new Quaternion();
const _va = new Vector3();
const _vb = new Vector3();
const _target = { pos: new Vector3(), quat: new Quaternion(), scale: 0 };

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const damp = (lambda: number, dt: number) => 1 - Math.exp(-lambda * dt);

function poseAt(c: Composition, index: number): ObjectPose {
  if (index === 0) return c.sachet;
  if (index === 1) return c.carton;
  return c.biscuits[index - 2];
}

/** Blends object `index` of two compositions into `_target` (local, anchor units). */
function blendObject(a: Composition, b: Composition | null, t: number, index: number, time: number) {
  const pa = poseAt(a, index);
  const pb = b ? poseAt(b, index) : pa;
  _va.fromArray(pa.p);
  _vb.fromArray(pb.p);
  _target.pos.lerpVectors(_va, _vb, t);
  _qa.setFromEuler(_euler.set(pa.r[0], pa.r[1], pa.r[2], "ZXY"));
  _qb.setFromEuler(_euler.set(pb.r[0], pb.r[1], pb.r[2], "ZXY"));
  _target.quat.slerpQuaternions(_qa, _qb, t);
  const v = pa.v + (pb.v - pa.v) * t;
  _target.scale = (pa.s + (pb.s - pa.s) * t) * smoothstep(0, 1, v);
  // idle float: gentle bob and wobble, de-phased per object
  _target.pos.y += Math.sin(time * 1.15 + index * 1.7) * 0.009;
  _qIdle.setFromEuler(_euler.set(Math.sin(time * 0.8 + index) * 0.025, 0, Math.sin(time * 0.62 + index * 2.1) * 0.02, "ZXY"));
  _target.quat.premultiply(_qIdle);
}

interface ScreenRect {
  /** Centre, canvas pixels. */
  x: number;
  y: number;
  /** min(width, height), pixels. */
  unit: number;
  /** Centre Y relative to the visual viewport top. */
  client: number;
}

interface JourneyProps {
  assets: ProductAssets;
  /** Changes when the anchors in the DOM change. */
  version: number;
  active: boolean;
  onFirstFrame: () => void;
}

/**
 * Projects the products onto the `[data-stage-anchor]` rectangles and blends
 * the per-stage compositions (poses.ts) while scrolling. Renders on demand:
 * frames are requested only while something moves (scroll, intro, damping,
 * idle float of visible products).
 */
export function Journey({ assets, version, active, onFirstFrame }: JourneyProps) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const invalidate = useThree((state) => state.invalidate);
  const root = useRef<Group>(null);
  const sachet = useRef<Group>(null);
  const carton = useRef<Group>(null);
  const biscuits = useRef<(Group | null)[]>([]);
  const runtime = useRef<Runtime | null>(null);
  const [live, setLive] = useState(false);
  const reported = useRef(false);
  const shadows = useSoftShadows(OBJECT_COUNT, -0.5, 0.42, 0.5);
  const casters = useRef<ShadowCaster[]>([]);

  // Compile every shader before the first visible frame (no hitch on reveal).
  useEffect(() => {
    let cancelled = false;
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        setLive(true);
        invalidate();
      });
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, assets, invalidate]);

  // Report the first rendered frame with products.
  useEffect(() => {
    if (!live || reported.current) return;
    const unsubscribe = addAfterEffect(() => {
      if (reported.current || !runtime.current?.initialised) return;
      reported.current = true;
      onFirstFrame();
      queueMicrotask(unsubscribe);
    });
    return unsubscribe;
  }, [live, onFirstFrame]);

  // Anchors, ScrollTrigger progress per stage section, pointer parallax.
  useEffect(() => {
    if (!active) return;
    const rt = (runtime.current ??= createRuntime());
    rt.anchors = scanAnchors();
    rt.hasIntro = rt.anchors.some((a) => a.id === "intro");
    if (!rt.hasIntro) rt.intro = 1;
    rt.initialised = false; // snap to the new page's anchors

    gsap.registerPlugin(ScrollTrigger);
    const triggers: ScrollTrigger[] = [];
    const seen = new Set<HTMLElement>();
    for (const anchor of rt.anchors) {
      if (!anchor.section || seen.has(anchor.section)) continue;
      seen.add(anchor.section);
      const id = anchor.id;
      const update = (self: ScrollTrigger) => {
        rt.progress.set(id, self.progress);
        invalidate();
      };
      triggers.push(
        ScrollTrigger.create({ trigger: anchor.section, start: "top bottom", end: "bottom top", onUpdate: update, onRefresh: update }),
      );
    }
    // any scroll (Lenis drives the window scroll and ScrollTrigger.update) wakes the loop
    triggers.push(ScrollTrigger.create({ start: 0, end: "max", onUpdate: () => invalidate(), onRefresh: () => invalidate() }));

    const wake = () => invalidate();
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onPointer = (event: PointerEvent) => {
      if (!fine.matches || event.pointerType !== "mouse") return;
      rt.tilt.ty = (event.clientX / window.innerWidth - 0.5) * 0.22;
      rt.tilt.tx = (event.clientY / window.innerHeight - 0.5) * 0.12;
      invalidate();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") invalidate();
    };
    window.addEventListener("resize", wake);
    window.visualViewport?.addEventListener("resize", wake);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    invalidate();
    return () => {
      triggers.forEach((trigger) => trigger.kill());
      window.removeEventListener("resize", wake);
      window.visualViewport?.removeEventListener("resize", wake);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, version, invalidate]);

  useFrame((state, rawDelta) => {
    const rt = runtime.current;
    const group = root.current;
    if (!live || !active || !rt || !group) return;
    const dt = Math.min(rawDelta, 1 / 20);
    rt.time += dt;
    const snap = !rt.initialised;

    // DOM nodes replaced (same ids, new page): re-scan
    if (rt.anchors.some((a) => !a.element.isConnected)) {
      rt.anchors = scanAnchors();
      rt.hasIntro = rt.anchors.some((a) => a.id === "intro");
    }

    // ---- anchors → screen rectangles ---------------------------------------
    const { width: W, height: H } = state.size;
    const canvasRect = gl.domElement.getBoundingClientRect();
    const viewportH = window.visualViewport?.height ?? window.innerHeight;
    const worldPerPx = (2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360)) / H;
    const focus = viewportH * FOCUS;

    let a = -1;
    let b = -1;
    let t = 0;
    let rectA: ScreenRect | null = null;
    let rectB: ScreenRect | null = null;
    const rects: (ScreenRect | null)[] = rt.anchors.map((anchor): ScreenRect | null => {
      const box = anchor.element.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) return null;
      return {
        x: box.left + box.width / 2 - canvasRect.left,
        y: box.top + box.height / 2 - canvasRect.top,
        unit: Math.min(box.width, box.height),
        client: box.top + box.height / 2,
      };
    });
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (!r) continue;
      if (a === -1 || r.client <= focus) {
        a = i;
        rectA = r;
        b = -1;
        rectB = null;
        if (r.client > focus) break; // focus above the first anchor
        continue;
      }
      // first visible anchor below the focus line
      b = i;
      rectB = r;
      break;
    }

    if (!rectA) {
      group.visible = false;
      return;
    }
    group.visible = true;
    if (rectB) {
      const span = rectB.client - rectA.client;
      t = span > 0 ? smoothstep(HOLD, 1 - HOLD, (focus - rectA.client) / span) : 0;
    }

    // ---- intro auto-play ----------------------------------------------------
    let introPlaying = false;
    if (rt.hasIntro && rt.intro < 1) {
      rt.intro = Math.min(1, rt.intro + dt / INTRO_SECONDS);
      introPlaying = rt.intro < 1;
      if (!introPlaying) introPlayed = true;
    }

    // ---- compositions -------------------------------------------------------
    const idA = rt.anchors[a].id;
    const compA = composeStage(idA, { time: rt.time, progress: rt.progress.get(idA) ?? 0.5, intro: rt.intro });
    let compB: Composition | null = null;
    if (rectB && b >= 0) {
      const idB = rt.anchors[b].id;
      compB = composeStage(idB, { time: rt.time, progress: rt.progress.get(idB) ?? 0.5, intro: rt.intro });
    }

    // ---- group: anchor rectangle in world space ------------------------------
    const ax = rectB ? rectA.x + (rectB.x - rectA.x) * t : rectA.x;
    const ay = rectB ? rectA.y + (rectB.y - rectA.y) * t : rectA.y;
    const au = rectB ? rectA.unit + (rectB.unit - rectA.unit) * t : rectA.unit;
    _va.set((ax - W / 2) * worldPerPx, -(ay - H / 2) * worldPerPx, 0);
    const unit = au * worldPerPx;
    const fg = snap ? 1 : damp(22, dt);
    rt.group.pos.lerp(_va, fg);
    rt.group.unit += (unit - rt.group.unit) * fg;
    const tilt = rt.tilt;
    const ft = damp(4, dt);
    tilt.x += (tilt.tx - tilt.x) * ft;
    tilt.y += (tilt.ty - tilt.y) * ft;
    group.position.copy(rt.group.pos);
    group.scale.setScalar(rt.group.unit);
    group.rotation.set(tilt.x, tilt.y, 0);

    let moving = Math.abs(tilt.tx - tilt.x) + Math.abs(tilt.ty - tilt.y) > SETTLE_EPSILON || rt.group.pos.distanceToSquared(_va) > 1e-8;

    // ---- objects ------------------------------------------------------------
    const fo = snap ? 1 : damp(introPlaying ? 14 : 6.5, dt);
    const nodes = [sachet.current, carton.current, ...biscuits.current];
    for (let i = 0; i < OBJECT_COUNT; i++) {
      const node = nodes[i];
      if (!node) continue;
      blendObject(compA, compB, t, i, rt.time);
      const o = rt.objects[i];
      if (o.pos.distanceToSquared(_target.pos) > 1e-8 || Math.abs(o.scale - _target.scale) > SETTLE_EPSILON) moving = true;
      o.pos.lerp(_target.pos, fo);
      o.quat.slerp(_target.quat, fo);
      o.scale += (_target.scale - o.scale) * fo;
      node.position.copy(o.pos);
      node.quaternion.copy(o.quat);
      node.scale.setScalar(Math.max(o.scale, 1e-5));
      node.visible = o.scale > 1e-3;
    }
    const targetOpen = compB ? compA.open + (compB.open - compA.open) * t : compA.open;
    rt.open += (targetOpen - rt.open) * (snap ? 1 : damp(introPlaying ? 16 : 5, dt));
    if (Math.abs(targetOpen - rt.open) > SETTLE_EPSILON) moving = true;
    setSachetOpen(sachet.current, rt.open);
    const list = casters.current;
    for (let i = 0; i < OBJECT_COUNT; i++) {
      list[i] ??= i === 0 ? { object: null, radius: 0.5, halfHeight: 0.75 } : i === 1 ? { object: null, radius: 0.62, halfHeight: 0.55 } : { object: null, radius: 0.5, halfHeight: 0.42, strength: 0.45 };
      list[i].object = nodes[i];
    }
    shadows.update(list);
    rt.initialised = true;

    // ---- keep rendering only while useful -----------------------------------
    const margin = au;
    const onScreen = ay > -margin && ay < viewportH + margin && ax > -margin && ax < W + margin;
    const idle = onScreen && document.visibilityState === "visible";
    if (introPlaying || moving || idle) state.invalidate();
  });

  // Tiny until the first frame places everything: the meshes stay visible so
  // compileAsync() (which skips invisible objects) warms every program up.
  return (
    <group ref={root} scale={1e-5}>
      <SachetModel ref={sachet} assets={assets} />
      <CartonModel ref={carton} assets={assets} />
      {Array.from({ length: BISCUIT_COUNT }, (_, i) => (
        <BiscuitModel
          key={i}
          ref={(node: Group | null) => {
            biscuits.current[i] = node;
          }}
          assets={assets}
        />
      ))}
      <primitive object={shadows.group} />
    </group>
  );
}
