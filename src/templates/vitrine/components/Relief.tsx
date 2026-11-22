"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useMotionLevel } from "../lib/context";

type Tilt = { x: number; y: number }; // -1..1

/* One shared deviceorientation listener for every card on the page. */
const gyroSubscribers = new Set<(t: Tilt) => void>();
let gyroBase: { beta: number; gamma: number } | null = null;
function onOrientation(event: DeviceOrientationEvent) {
  if (event.beta === null || event.gamma === null) return;
  gyroBase ??= { beta: event.beta, gamma: event.gamma };
  const t = {
    x: Math.max(-1, Math.min(1, (event.gamma - gyroBase.gamma) / 25)),
    y: Math.max(-1, Math.min(1, (event.beta - gyroBase.beta) / 25)),
  };
  gyroSubscribers.forEach((fn) => fn(t));
}
function subscribeGyro(fn: (t: Tilt) => void) {
  if (gyroSubscribers.size === 0) window.addEventListener("deviceorientation", onOrientation);
  gyroSubscribers.add(fn);
  return () => {
    gyroSubscribers.delete(fn);
    if (gyroSubscribers.size === 0) {
      window.removeEventListener("deviceorientation", onOrientation);
      gyroBase = null;
    }
  };
}

/**
 * Relief card: the plate tilts towards the pointer and a specular highlight
 * (plus a rim light and a floor shadow) follows the light position.
 * - fine pointer: follows the mouse;
 * - touch: follows the gyroscope when the device reports it, otherwise the
 *   card's position in the viewport while scrolling (light "slides" over it);
 * - only animates while visible; off in "simple"/"none" motion.
 * The children are the layers (use .vt-relief__media for the floating image).
 */
export function Relief({
  children,
  className = "",
  max = 10,
  style,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const motion = useMotionLevel();

  useEffect(() => {
    const el = ref.current;
    if (!el || motion !== "full") return;
    let frame = 0;
    let visible = false;
    let gyroActive = false;
    const apply = ({ x, y }: Tilt, active: boolean) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--ry", `${(x * max).toFixed(2)}deg`);
        el.style.setProperty("--rx", `${(-y * max).toFixed(2)}deg`);
        el.style.setProperty("--lx", `${(50 + x * 45).toFixed(1)}%`);
        el.style.setProperty("--ly", `${(40 + y * 45).toFixed(1)}%`);
        el.style.setProperty("--lift", active ? "18px" : "0px");
        el.dataset.active = String(active);
      });
    };
    const rest = () => {
      cancelAnimationFrame(frame);
      el.style.removeProperty("--rx");
      el.style.removeProperty("--ry");
      el.style.removeProperty("--lx");
      el.style.removeProperty("--ly");
      el.style.removeProperty("--lift");
      el.dataset.active = "false";
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = el.getBoundingClientRect();
      apply({ x: ((event.clientX - rect.left) / rect.width) * 2 - 1, y: ((event.clientY - rect.top) / rect.height) * 2 - 1 }, true);
    };
    const onLeave = (event: PointerEvent) => event.pointerType === "mouse" && rest();
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(el);
    const onScroll = () => {
      if (!visible || gyroActive) return;
      const rect = el.getBoundingClientRect();
      const center = (rect.top + rect.height / 2) / window.innerHeight; // 0 top … 1 bottom
      apply({ x: 0.25 * Math.sin(center * Math.PI * 2), y: (center - 0.5) * 1.1 }, false);
    };
    const unsubscribe = coarse
      ? subscribeGyro((t) => {
          gyroActive = true;
          if (visible) apply(t, false);
        })
      : () => {};
    if (coarse) {
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      unsubscribe();
      io.disconnect();
    };
  }, [motion, max]);

  return (
    <div ref={ref} className={`vt-relief ${className}`} style={style}>
      <div className="vt-relief__body">
        <div aria-hidden className="vt-relief__plate" />
        {children}
        <div aria-hidden className="vt-relief__spec" />
        <div aria-hidden className="vt-relief__rim" />
      </div>
      <div aria-hidden className="vt-relief__floor" />
    </div>
  );
}
