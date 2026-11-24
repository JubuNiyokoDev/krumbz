"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { WebGLRenderer, Texture } from "three";
import type { KitProduct } from "@/lib/storefront/kit";

interface Options<T> {
  products: KitProduct[];
  create: (options: { renderer: WebGLRenderer; products: KitProduct[]; signal: AbortSignal; onProgress: (value: number) => void }) => Promise<T>;
  onProgress?: (value: number) => void;
  onError?: (error: unknown) => void;
}

/**
 * Same lifecycle as useProductAssets, for the shops without bespoke 3D
 * (src/lib/three/generic.ts): loads the products' models / photos for the
 * current renderer, installs the studio environment, disposes on unmount.
 */
export function useGenericAssets<T extends { environment: Texture; dispose(): void }>({ products, create, onProgress, onError }: Options<T>): T | null {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const [assets, setAssets] = useState<T | null>(null);
  const callbacks = useRef({ onProgress, onError, create });
  useEffect(() => {
    callbacks.current = { onProgress, onError, create };
  });

  // stable key: re-create only when the products really change
  const key = JSON.stringify(products);

  useEffect(() => {
    const controller = new AbortController();
    let created: T | null = null;
    callbacks.current
      .create({
        renderer: gl,
        products: JSON.parse(key) as KitProduct[],
        signal: controller.signal,
        onProgress: (value) => callbacks.current.onProgress?.(value),
      })
      .then((result) => {
        if (controller.signal.aborted) {
          result.dispose();
          return;
        }
        created = result;
        scene.environment = result.environment;
        scene.environmentIntensity = 1;
        setAssets(result);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        callbacks.current.onError?.(error);
      });
    return () => {
      controller.abort();
      if (created) {
        if (scene.environment === created.environment) scene.environment = null;
        created.dispose();
      }
      setAssets(null);
    };
  }, [gl, scene, key]);

  return assets;
}
