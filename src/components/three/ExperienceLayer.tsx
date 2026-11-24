"use client";

import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from "react";
import type { TextureMap } from "@/lib/assets/registry";
import { useKit } from "@/lib/storefront/kit";
import { getAnchorVersion, getServerAnchorVersion, subscribeAnchors } from "@/lib/three/anchors";
import { useGlArbiter } from "@/lib/three/glArbiter";
import { useExperience, useRenderMode } from "@/store/experience";
import { ExperienceLoader } from "./ExperienceLoader";

/** The WebGL chunk (three, R3F, drei, GSAP ScrollTrigger) — fetched only in "3d" mode on pages with anchors. */
const ExperienceCanvas = lazy(() => import("./ExperienceCanvas"));

const noSubscription = () => () => {};

/**
 * Global 3D layer, mounted once by the locale layout.
 *
 * Initial cost ≈ nothing: no three.js in this module graph. After the page has
 * loaded and the main thread is idle it runs `detectCapabilities()`; only in
 * "3d" mode and when the current page has `[data-stage-anchor]` elements does
 * it fetch the WebGL chunk. Pages without anchors keep the (hidden) canvas
 * paused with `frameloop="never"`; a ProductViewer on the page makes it
 * unmount so that a single WebGL context is ever alive.
 */
export function ExperienceLayer({ textures }: { textures: TextureMap }) {
  const setCapabilities = useExperience((s) => s.setCapabilities);
  const ready = useExperience((s) => s.ready);
  const mode = useRenderMode();
  const viewerClaimed = useGlArbiter((s) => s.viewer !== null);
  const kit = useKit();

  useEffect(() => {
    if (useExperience.getState().capabilities) return;
    let cancelled = false;
    let idle = 0;
    let timeout = 0;
    const run = () => {
      // detect-gpu stays out of the initial bundle too
      import("@/lib/device/capabilities")
        .then(({ detectCapabilities }) => detectCapabilities())
        .then((caps) => {
          if (!cancelled) setCapabilities(caps);
        })
        .catch(() => {
          if (!cancelled) {
            setCapabilities({ mode: "static", tier: 0, isMobile: false, reducedMotion: false, saveData: false, maxDpr: 1, reason: "error" });
          }
        });
    };
    const schedule = () => {
      if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(run, { timeout: 1500 });
      else timeout = window.setTimeout(run, 250);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", schedule);
      if (idle) window.cancelIdleCallback(idle);
      if (timeout) window.clearTimeout(timeout);
    };
  }, [setCapabilities]);

  const version = useSyncExternalStore(mode === "3d" ? subscribeAnchors : noSubscription, getAnchorVersion, getServerAnchorVersion);
  const hasAnchors = mode === "3d" && version > 0;

  // Keep the canvas once loaded (instant return to the home page), but drop it
  // whenever a ProductViewer claims the GPU.
  const [loaded, setLoaded] = useState(false);
  if (hasAnchors && !viewerClaimed && !loaded) setLoaded(true);
  if (viewerClaimed && loaded) setLoaded(false);

  if (mode !== "3d") return null;
  const active = hasAnchors && !viewerClaimed;

  return (
    <>
      {loaded && !viewerClaimed ? (
        <Suspense fallback={null}>
          <ExperienceCanvas textures={textures} active={active} version={version} kit={kit} />
        </Suspense>
      ) : null}
      <ExperienceLoader visible={active && !ready} />
    </>
  );
}
