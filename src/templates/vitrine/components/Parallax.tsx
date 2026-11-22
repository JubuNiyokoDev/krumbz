"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useMotionLevel } from "../lib/context";

/**
 * Parallax container: sets --px/--py (pointer, -1..1) and --sy (scroll offset
 * of the container in px) on itself. Children with class "vt-par" and a
 * `--depth` move proportionally (see vitrine.css). Off unless motion is "full".
 */
export function Parallax({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const motion = useMotionLevel();

  useEffect(() => {
    const el = ref.current;
    if (!el || motion !== "full") return;
    let frame = 0;
    let visible = true;
    const set = (fn: () => void) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fn);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      // Coming back into view (e.g. after a jump to the top): refresh the stale offset.
      if (visible) onScroll();
    });
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !visible) return;
      set(() => {
        el.style.setProperty("--px", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
        el.style.setProperty("--py", ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
      });
    };
    const onScroll = () => {
      if (!visible) return;
      set(() => {
        const rect = el.getBoundingClientRect();
        const sy = -(rect.top + rect.height / 2 - window.innerHeight / 2) / 10;
        el.style.setProperty("--sy", Math.max(-60, Math.min(60, sy)).toFixed(1));
      });
    };
    io.observe(el);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [motion]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
