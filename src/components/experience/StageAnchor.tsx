"use client";

import type { ReactNode } from "react";
import { useExperience, useRenderMode } from "@/store/experience";
import { STAGE_ANCHOR_ATTR, STAGE_POSE_ATTR, type StageId } from "@/lib/experience/stages";

/**
 * Marks where the 3D products sit for a stage (see src/lib/experience/stages.ts).
 * In static mode (low-end device, reduced motion, data saver, WebGL failure)
 * it renders `fallback` (a still product image) in the same box instead.
 * The box must have a size: pass sizing classes (e.g. "aspect-square w-64").
 */
export function StageAnchor({
  id,
  pose,
  fallback,
  className = "",
  eager = false,
}: {
  id: StageId;
  /** Composition of src/components/three/poses.ts (default: the id). */
  pose?: string;
  fallback?: ReactNode;
  className?: string;
  /**
   * Above the fold (intro): the still image is in the server HTML and stays
   * until the 3D has drawn its first frame — fast LCP on every device, and an
   * image instead of an empty box while the 3D loads.
   */
  eager?: boolean;
}) {
  const mode = useRenderMode();
  const ready = useExperience((s) => s.ready);
  const showFallback = mode === "static" || (eager && !(mode === "3d" && ready));
  return (
    <div {...{ [STAGE_ANCHOR_ATTR]: id, ...(pose && pose !== id ? { [STAGE_POSE_ATTR]: pose } : {}) }} className={`relative ${className}`} aria-hidden={mode !== "static" || !fallback}>
      {showFallback ? fallback : null}
    </div>
  );
}
