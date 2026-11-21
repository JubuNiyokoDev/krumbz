"use client";

import { getGPUTier } from "detect-gpu";

export type RenderMode = "3d" | "static";

export interface Capabilities {
  mode: RenderMode;
  /** 0 = no WebGL / blocklisted, 1 = low, 2 = mid, 3 = high (detect-gpu tiers). */
  tier: 0 | 1 | 2 | 3;
  isMobile: boolean;
  reducedMotion: boolean;
  saveData: boolean;
  /** Device pixel ratio cap to apply to the renderer. */
  maxDpr: number;
  reason: string;
}

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isSaveData(): boolean {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  if (!connection) return false;
  return Boolean(connection.saveData) || connection.effectiveType === "2g" || connection.effectiveType === "slow-2g";
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * True when WebGL is emulated on the CPU (SwiftShader, llvmpipe…): no graphics
 * card is used, so the 3D would freeze the page. These devices get still images.
 */
function isSoftwareRenderer(): boolean {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
  } catch {
    return false;
  }
}

/** URL override for QA: ?mode=static or ?mode=3d forces the render mode. */
function forcedMode(): RenderMode | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("mode");
  return value === "static" || value === "3d" ? value : null;
}

let pending: Promise<Capabilities> | null = null;

/**
 * Decides once per page load whether the WebGL experience runs.
 * Falls back to static images on: reduced motion, data saver / 2G,
 * no WebGL, or a low-tier / blocklisted GPU.
 */
export function detectCapabilities(): Promise<Capabilities> {
  pending ??= (async () => {
    const reducedMotion = prefersReducedMotion();
    const saveData = isSaveData();
    const base = { reducedMotion, saveData, isMobile: false, tier: 0 as Capabilities["tier"], maxDpr: 1 };
    const forced = forcedMode();

    if (!forced && reducedMotion) return { ...base, mode: "static", reason: "prefers-reduced-motion" };
    if (!forced && saveData) return { ...base, mode: "static", reason: "save-data" };
    if (!hasWebGL()) return { ...base, mode: "static", reason: "no-webgl" };
    if (!forced && isSoftwareRenderer()) return { ...base, mode: "static", reason: "software-renderer" };

    try {
      const gpu = await getGPUTier({ benchmarksURL: "/vendor/detect-gpu" });
      const tier = gpu.tier as Capabilities["tier"];
      const isMobile = Boolean(gpu.isMobile);
      const maxDpr = tier >= 3 ? 2 : tier === 2 ? (isMobile ? 1.5 : 1.75) : 1.25;
      const caps = { ...base, tier, isMobile, maxDpr };
      if (forced) return { ...caps, mode: forced, reason: "forced" };
      if (tier < 1) return { ...caps, mode: "static", reason: `gpu-tier-${tier}` };
      return { ...caps, mode: "3d", reason: `gpu-tier-${tier}` };
    } catch {
      // Benchmarks unavailable (offline…): trust WebGL, stay conservative on DPR.
      return { ...base, tier: 1, maxDpr: 1.25, mode: forced ?? "3d", reason: "gpu-unknown" };
    }
  })();
  return pending;
}
