"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

/** Live `prefers-reduced-motion: reduce` (false during SSR). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}

/** Non-hook variant for event handlers and imperative animation code. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}
