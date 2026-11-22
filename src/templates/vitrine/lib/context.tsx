"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { PlatformLocale, TenantFeatures } from "@/lib/tenant/types";
import type { Capabilities } from "@/lib/device/capabilities";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { UiStrings } from "./i18n";
import type { ResolvedLinks } from "./links";
import { getCartStore, type CatalogItem } from "./cart";

export interface VitrineClientData {
  tenantSlug: string;
  shopName: string;
  whatsapp: string;
  locale: PlatformLocale;
  features: TenantFeatures;
  ui: UiStrings;
  links: ResolvedLinks;
  catalog: CatalogItem[];
}

const Ctx = createContext<VitrineClientData | null>(null);

export function VitrineProvider({ value, children }: { value: VitrineClientData; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useVitrine(): VitrineClientData {
  const value = useContext(Ctx);
  if (!value) throw new Error("useVitrine() outside <VitrineProvider>");
  return value;
}

export function useCart() {
  return getCartStore(useVitrine().tenantSlug);
}

/**
 * Animation level: "full" (smooth scroll, scrubbed storytelling, tilt),
 * "simple" (fades only: features.advancedAnimations = false) or "none"
 * (prefers-reduced-motion).
 */
export type MotionLevel = "full" | "simple" | "none";

export function useMotionLevel(): MotionLevel {
  const { features } = useVitrine();
  const reduced = useReducedMotion();
  if (reduced) return "none";
  return features.advancedAnimations ? "full" : "simple";
}

export type StageMode = { mode: "pending" | "3d" | "photo"; reason: string; maxDpr: number };

/**
 * Whether real-time 3D runs: tenant feature flag first, then the shared device
 * capability detection (low-end GPU, reduced motion, data saver, no WebGL →
 * photo presentation). `?mode=3d|static` forces it for QA.
 */
export function useStageMode(): StageMode {
  const { features } = useVitrine();
  const [caps, setCaps] = useState<Capabilities | null>(null);
  useEffect(() => {
    if (!features.threeD) return;
    let alive = true;
    // Loaded on demand: keeps detect-gpu out of the initial bundle.
    void import("@/lib/device/capabilities")
      .then(({ detectCapabilities }) => detectCapabilities())
      .then((c) => alive && setCaps(c));
    return () => {
      alive = false;
    };
  }, [features.threeD]);
  if (!features.threeD) return { mode: "photo", reason: "feature-disabled", maxDpr: 1 };
  if (!caps) return { mode: "pending", reason: "detecting", maxDpr: 1 };
  return { mode: caps.mode === "3d" ? "3d" : "photo", reason: caps.reason, maxDpr: Math.min(caps.maxDpr, 2) };
}
