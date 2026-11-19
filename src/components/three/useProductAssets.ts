"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { TextureMap } from "@/lib/assets/registry";
import { createProductAssets, type ProductAssets, type Quality } from "@/lib/three/assets";
import type { BrandTexts } from "@/lib/three/labels";

interface Options {
  textures: TextureMap;
  quality: Quality;
  brand: BrandTexts;
  onProgress?: (value: number) => void;
  onError?: (error: unknown) => void;
}

/**
 * Loads the product assets for the current renderer, installs the studio
 * environment on the scene and disposes everything on unmount.
 */
export function useProductAssets({ textures, quality, brand, onProgress, onError }: Options): ProductAssets | null {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const [assets, setAssets] = useState<ProductAssets | null>(null);
  const callbacks = useRef({ onProgress, onError });
  useEffect(() => {
    callbacks.current = { onProgress, onError };
  });

  // stable key: re-create only when an input really changes
  const key = JSON.stringify([textures, quality, brand]);

  useEffect(() => {
    const controller = new AbortController();
    let created: ProductAssets | null = null;
    const [textureMap, q, texts] = JSON.parse(key) as [TextureMap, Quality, BrandTexts];
    createProductAssets({
      renderer: gl,
      textures: textureMap,
      quality: q,
      brand: texts,
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
