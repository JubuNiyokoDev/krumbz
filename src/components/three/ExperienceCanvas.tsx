"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NeutralToneMapping } from "three";
import type { TextureMap } from "@/lib/assets/registry";
import { KRUMBZ_KIT, type StorefrontKit } from "@/lib/storefront/kit";
import { qualityFor } from "@/lib/three/assets";
import { createGenericJourneyAssets } from "@/lib/three/generic";
import { installThreeConsoleFilter } from "@/lib/three/console";
import { useGlArbiter } from "@/lib/three/glArbiter";
import type { BrandTexts } from "@/lib/three/labels";
import { useExperience } from "@/store/experience";
import { Journey } from "./Journey";
import { StudioLights } from "./models";
import { BISCUIT_COUNT } from "./poses";
import { useGenericAssets } from "./useGenericAssets";
import { useProductAssets } from "./useProductAssets";

installThreeConsoleFilter();

export interface ExperienceCanvasProps {
  textures: TextureMap;
  /** False on pages without anchors: the canvas is hidden and does not render. */
  active: boolean;
  /** Anchor set version (see src/lib/three/anchors.ts). */
  version: number;
  /** Shop kit (src/lib/storefront/kit.tsx): Krumbz = bespoke procedural products. */
  kit?: StorefrontKit;
}

function useBrandTexts(): BrandTexts {
  const t = useTranslations("brand");
  return useMemo(
    () => ({
      name: t("name"),
      tagline: t("tagline"),
      base: t("base"),
      origin: t("origin"),
      company: t("company"),
      promise: t("promise"),
    }),
    [t],
  );
}

/** Any other shop: its products (glTF / photo cards) on the same journey. */
function GenericScene({ kit, active, version }: { kit: StorefrontKit; active: boolean; version: number }) {
  const setLoadProgress = useExperience((s) => s.setLoadProgress);
  const setReady = useExperience((s) => s.setReady);
  const setFailed = useExperience((s) => s.setFailed);
  const generic = useGenericAssets({
    products: kit.products,
    create: (options) => createGenericJourneyAssets({ ...options, biscuitCount: BISCUIT_COUNT }),
    onProgress: (value) => setLoadProgress(Math.round(8 + value * 84)),
    onError: (error) => {
      console.error("[3d] chargement impossible", error);
      setFailed(true);
    },
  });
  const onFirstFrame = useCallback(() => {
    setLoadProgress(100);
    setReady(true);
  }, [setLoadProgress, setReady]);

  return (
    <>
      <StudioLights />
      {generic ? <Journey generic={generic} version={version} active={active} onFirstFrame={onFirstFrame} /> : null}
    </>
  );
}

function Scene({ textures, active, version, brand }: ExperienceCanvasProps & { brand: BrandTexts }) {
  const capabilities = useExperience((s) => s.capabilities);
  const setLoadProgress = useExperience((s) => s.setLoadProgress);
  const setReady = useExperience((s) => s.setReady);
  const setFailed = useExperience((s) => s.setFailed);
  const assets = useProductAssets({
    textures,
    quality: qualityFor(capabilities),
    brand,
    onProgress: (value) => setLoadProgress(Math.round(8 + value * 84)),
    onError: (error) => {
      console.error("[krumbz-3d] chargement impossible", error);
      setFailed(true);
    },
  });
  const onFirstFrame = useCallback(() => {
    setLoadProgress(100);
    setReady(true);
  }, [setLoadProgress, setReady]);

  return (
    <>
      <StudioLights />
      {assets ? <Journey assets={assets} version={version} active={active} onFirstFrame={onFirstFrame} /> : null}
    </>
  );
}

/**
 * The fixed, full-screen WebGL layer of the home journey. Loaded lazily by
 * ExperienceLayer (separate chunk: three, R3F, drei, GSAP live here only).
 */
export default function ExperienceCanvas({ textures, active, version, kit = KRUMBZ_KIT }: ExperienceCanvasProps) {
  const capabilities = useExperience((s) => s.capabilities);
  const setFailed = useExperience((s) => s.setFailed);
  const setReady = useExperience((s) => s.setReady);
  const setLoadProgress = useExperience((s) => s.setLoadProgress);
  const setExperienceAlive = useGlArbiter((s) => s.setExperienceAlive);
  const brand = useBrandTexts();
  const maxDpr = capabilities?.maxDpr ?? 1.5;
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, maxDpr));
  const disposing = useRef(false);
  const cleanupContext = useRef<(() => void) | null>(null);

  useEffect(() => {
    disposing.current = false;
    setExperienceAlive(true);
    setLoadProgress(4);
    return () => {
      disposing.current = true;
      cleanupContext.current?.();
      setReady(false);
      setLoadProgress(0);
      setExperienceAlive(false);
    };
  }, [setExperienceAlive, setLoadProgress, setReady]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[5] h-lvh min-h-screen w-full select-none"
      style={{ visibility: active ? "visible" : "hidden" }}
    >
      <Canvas
        frameloop={active ? "demand" : "never"}
        dpr={dpr}
        camera={{ fov: 30, position: [0, 0, 10], near: 0.1, far: 40 }}
        gl={{ antialias: true, alpha: true, stencil: false, powerPreference: "high-performance" }}
        resize={{ scroll: false, debounce: { scroll: 0, resize: 80 } }}
        style={{ pointerEvents: "none" }}
        onCreated={({ gl }) => {
          gl.toneMapping = NeutralToneMapping;
          gl.toneMappingExposure = 1.02;
          const canvas = gl.domElement;
          const onLost = (event: Event) => {
            if (disposing.current) return;
            event.preventDefault();
            console.warn("[krumbz-3d] contexte WebGL perdu : passage en images fixes.");
            setFailed(true);
          };
          canvas.addEventListener("webglcontextlost", onLost);
          cleanupContext.current = () => canvas.removeEventListener("webglcontextlost", onLost);
        }}
      >
        <PerformanceMonitor
          factor={1}
          flipflops={3}
          onChange={({ factor }) => setDpr(Math.max(1, Math.round((1 + factor * (maxDpr - 1)) * 4) / 4))}
          onFallback={() => setDpr(1)}
        />
        {kit.bespoke ? (
          <Scene textures={textures} active={active} version={version} brand={brand} />
        ) : (
          <GenericScene kit={kit} active={active} version={version} />
        )}
      </Canvas>
    </div>
  );
}
