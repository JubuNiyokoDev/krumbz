"use client";

import { create } from "zustand";
import type { Capabilities } from "@/lib/device/capabilities";

/**
 * Shared state between the page UI and the WebGL layer.
 * - `capabilities` is null until detection finishes (render mode undecided).
 * - `loadProgress` goes 0 → 100 while 3D assets load; `ready` flips when the
 *   first frame with products has rendered.
 */
interface ExperienceState {
  capabilities: Capabilities | null;
  loadProgress: number;
  ready: boolean;
  /** Set by the 3D layer when it fails (context lost, texture error…). */
  failed: boolean;
  setCapabilities: (caps: Capabilities) => void;
  setLoadProgress: (value: number) => void;
  setReady: (value: boolean) => void;
  setFailed: (value: boolean) => void;
}

export const useExperience = create<ExperienceState>()((set) => ({
  capabilities: null,
  loadProgress: 0,
  ready: false,
  failed: false,
  setCapabilities: (capabilities) => {
    // Inspectable without console noise: <html data-render-mode="static" data-render-reason="gpu-tier-0">
    document.documentElement.dataset.renderMode = capabilities.mode;
    document.documentElement.dataset.renderReason = capabilities.reason;
    set({ capabilities });
  },
  setLoadProgress: (loadProgress) => set({ loadProgress }),
  setReady: (ready) => set({ ready }),
  setFailed: (failed) => set({ failed }),
}));

/** "pending" until detection, then "3d" or "static" (failures switch to static). */
export function useRenderMode(): "pending" | "3d" | "static" {
  return useExperience((s) => (s.failed ? "static" : (s.capabilities?.mode ?? "pending")));
}

export type StaticReason = "reducedMotion" | "saveData" | "noWebgl" | "gpu" | "error";

/** Why the site fell back to still images (null while 3D runs or detection is pending). */
export function useStaticReason(): StaticReason | null {
  return useExperience((s) => {
    if (s.failed) return "error";
    const caps = s.capabilities;
    if (!caps || caps.mode !== "static") return null;
    if (caps.reason === "prefers-reduced-motion") return "reducedMotion";
    if (caps.reason === "save-data") return "saveData";
    if (caps.reason === "no-webgl") return "noWebgl";
    return "gpu";
  });
}
