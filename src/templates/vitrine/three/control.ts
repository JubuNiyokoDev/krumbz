import { useRef } from "react";

/**
 * Mutable state shared between the DOM (scroll, drag, buttons) and the WebGL
 * scene without React re-renders. The canvas damps towards these targets and
 * renders on demand only while something moves.
 */
export interface StageControl {
  /** Target rotation driven by the page (scroll journey, buttons), radians. */
  yaw: number;
  pitch: number;
  /** Offset added by the user's drag. */
  userYaw: number;
  userPitch: number;
  /** Vertical lift (scene units) and scale multiplier. */
  lift: number;
  scale: number;
  /** Slow idle turn until the user interacts. */
  autoRotate: boolean;
  /** Set by the canvas: requests a frame. */
  invalidate: () => void;
}

export function createStageControl(init: Partial<StageControl> = {}): StageControl {
  return { yaw: 0, pitch: 0, userYaw: 0, userPitch: 0, lift: 0, scale: 1, autoRotate: false, invalidate: () => {}, ...init };
}

/** Ref holder: the DOM and the canvas mutate `.current` (never during render). */
export type StageControlRef = { readonly current: StageControl };

export function useStageControl(init: Partial<StageControl> = {}): StageControlRef {
  const ref = useRef<StageControl | null>(null);
  if (ref.current === null) ref.current = createStageControl(init);
  return ref as StageControlRef;
}
