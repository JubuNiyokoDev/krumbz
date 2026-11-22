"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const ShaderBackdrop = dynamic(() => import("./ShaderBackdrop"), { ssr: false });

/**
 * Mounts the WebGL backdrop only on wide screens, without reduced motion, and
 * only once the page is idle (after load): it never competes with the LCP.
 */
export function HeroBackdrop() {
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (reduced || !window.matchMedia("(min-width: 768px)").matches) return;
    let idle = 0;
    let timer = 0;
    const schedule = () => {
      if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(() => setReady(true), { timeout: 2500 });
      else timer = window.setTimeout(() => setReady(true), 1200);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      window.removeEventListener("load", schedule);
      if (idle) window.cancelIdleCallback(idle);
      window.clearTimeout(timer);
    };
  }, [reduced]);

  return ready && !reduced ? <ShaderBackdrop /> : null;
}
