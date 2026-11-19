"use client";

import { create } from "zustand";

/**
 * Guarantees a single live WebGL context on the page.
 * - A ProductViewer claims the GPU; the global ExperienceLayer then unmounts
 *   its canvas (releasing its context) and the viewer waits for that release
 *   (`experienceAlive === false`) before creating its own canvas.
 * - Only one viewer at a time holds the claim; others keep their fallback image.
 * No three.js import: safe for the initial bundle.
 */
interface GlArbiterState {
  viewer: symbol | null;
  experienceAlive: boolean;
  claimViewer: (id: symbol) => boolean;
  releaseViewer: (id: symbol) => void;
  setExperienceAlive: (alive: boolean) => void;
}

export const useGlArbiter = create<GlArbiterState>()((set, get) => ({
  viewer: null,
  experienceAlive: false,
  claimViewer: (id) => {
    const current = get().viewer;
    if (current && current !== id) return false;
    if (!current) set({ viewer: id });
    return true;
  },
  releaseViewer: (id) => {
    if (get().viewer === id) set({ viewer: null });
  },
  setExperienceAlive: (experienceAlive) => set({ experienceAlive }),
}));
