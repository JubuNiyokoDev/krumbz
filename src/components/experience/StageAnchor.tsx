"use client";

import type { ReactNode } from "react";
import { useRenderMode } from "@/store/experience";
import { STAGE_ANCHOR_ATTR, type StageId } from "@/lib/experience/stages";

/**
 * Marks where the 3D products sit for a stage (see src/lib/experience/stages.ts).
 * In static mode (low-end device, reduced motion, data saver, WebGL failure)
 * it renders `fallback` (a still product image) in the same box instead.
 * The box must have a size: pass sizing classes (e.g. "aspect-square w-64").
 */
export function StageAnchor({ id, fallback, className = "" }: { id: StageId; fallback?: ReactNode; className?: string }) {
  const mode = useRenderMode();
  return (
    <div {...{ [STAGE_ANCHOR_ATTR]: id }} className={`relative ${className}`} aria-hidden={mode !== "static" || !fallback}>
      {mode === "static" ? fallback : null}
    </div>
  );
}
