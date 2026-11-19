import {
  BackSide,
  Color,
  FrontSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Vector2,
  type BufferGeometry,
  type Material,
  type Texture,
  type WebGLRenderer,
} from "three";
import type { TextureMap } from "@/lib/assets/registry";
import type { Capabilities } from "@/lib/device/capabilities";
import { BAKED_MAPS } from "./baked";
import { biscuitPatternSvg, processRelief } from "./bake/biscuitRelief";
import { BISCUIT_DETAIL, BISCUIT_DISPLACEMENT, createBiscuitGeometry } from "./geometry/biscuit";
import { createCartonGeometry } from "./geometry/carton";
import { createSachetGeometry, SACHET_DETAIL } from "./geometry/sachet";
import { createStudioEnvironment } from "./environment";
import { drawCartonBoard, drawCartonLabel, drawSachetBack, drawSachetFront, loadLabelFonts, type BrandTexts } from "./labels";
import {
  canvasTexture,
  dataTexture,
  disposeTextureLoaders,
  dominantColor,
  isKtx2,
  loadImage,
  loadTexture,
  textureImage,
} from "./textures";

export type Quality = "low" | "mid" | "high";

export function qualityFor(caps: Capabilities | null): Quality {
  if (!caps) return "mid";
  if (caps.tier >= 3 && !caps.isMobile) return "high";
  if (caps.tier >= 2) return "mid";
  return "low";
}

export interface ProductAssets {
  quality: Quality;
  biscuit: { geometry: BufferGeometry; materials: [Material, Material] };
  sachet: { geometry: BufferGeometry; outer: Material; inner: Material };
  carton: { geometry: BufferGeometry; materials: Material[] };
  environment: Texture;
  dispose(): void;
}

export interface AssetOptions {
  renderer: WebGLRenderer;
  textures: TextureMap;
  quality: Quality;
  brand: BrandTexts;
  /** 0 → 1 */
  onProgress?: (value: number) => void;
  signal?: AbortSignal;
}

/** Re-bakes the relief maps in the browser when the baked files are unavailable. */
async function bakeInBrowser(size: number) {
  const svg = biscuitPatternSvg(size);
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D canvas unavailable");
  ctx.drawImage(image, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const maps = processRelief(data, size, 4);
  return {
    height: dataTexture(maps.height, size, 1, false),
    normal: dataTexture(maps.normal, size, 3, false),
    color: dataTexture(maps.color, size, 3, true),
  };
}

const aborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
};

/**
 * Builds every product (geometry, materials, textures, environment) for one
 * renderer. User textures (TextureMap) are applied here, at runtime, so that
 * dropping a PNG in /public needs no rebuild; missing ones get the procedural
 * Krumbz packaging.
 */
export async function createProductAssets({ renderer, textures, quality, brand, onProgress, signal }: AssetOptions): Promise<ProductAssets> {
  const owned: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(item: T): T => {
    owned.push(item);
    return item;
  };
  const disposeAll = () => {
    for (const item of owned) item.dispose();
    owned.length = 0;
  };

  try {
    const steps = 9;
    let done = 0;
    const tick = () => onProgress?.(Math.min(1, ++done / steps));
    const anisotropy = quality === "high" ? 8 : 4;

    // 1. environment (sync, tiny)
    const envTarget = track(createStudioEnvironment(renderer));
    tick();

    // 2. baked relief maps + user textures, in parallel
    const optional = async (url: string | null, srgb: boolean) => {
      if (!url) return null;
      try {
        return track(await loadTexture(url, renderer, { srgb, anisotropy }));
      } catch (error) {
        console.info(`[krumbz-3d] texture ignorée (${url}) :`, error);
        return null;
      } finally {
        tick();
      }
    };
    const baked = (async () => {
      try {
        const [height, normal, color] = await Promise.all([
          loadTexture(BAKED_MAPS.biscuitHeight, renderer, { srgb: false, anisotropy: 1 }),
          loadTexture(BAKED_MAPS.biscuitNormal, renderer, { srgb: false, anisotropy }),
          loadTexture(BAKED_MAPS.biscuitColor, renderer, { srgb: true, anisotropy }),
        ]);
        return { height: track(height), normal: track(normal), color: track(color) };
      } catch {
        const maps = await bakeInBrowser(512);
        track(maps.height);
        track(maps.normal);
        track(maps.color);
        return maps;
      } finally {
        tick();
        tick();
        tick();
      }
    })();
    const [relief, biscuitTop, sachetFront, sachetBack, cartonLabel] = await Promise.all([
      baked,
      optional(textures.biscuitTop, true),
      optional(textures.sachetFront, true),
      optional(textures.sachetBack, true),
      optional(textures.cartonLabel, true),
    ]);
    aborted(signal);

    // 3. procedural packaging for the missing labels
    const illustration = textureImage(biscuitTop) ?? textureImage(relief.color);
    let front = sachetFront;
    let back = sachetBack;
    let label = cartonLabel;
    if (!front || !back || !label) {
      const fonts = await loadLabelFonts();
      aborted(signal);
      front ??= track(canvasTexture(drawSachetFront(brand, fonts, illustration), renderer, true, anisotropy));
      back ??= track(canvasTexture(drawSachetBack(brand, fonts), renderer, true, anisotropy));
      label ??= track(canvasTexture(drawCartonLabel(brand, fonts, illustration), renderer, true, anisotropy));
    }

    // carton caps/sides take the label's dominant colour
    let boardColor = "#e2a23a";
    if (cartonLabel) {
      const image = textureImage(cartonLabel);
      if (image) boardColor = dominantColor(image, boardColor);
      else if (textures.cartonLabel && isKtx2(textures.cartonLabel)) {
        try {
          const thumb = await loadImage(textures.cartonLabel.replace(/\.ktx2(\?.*)?$/i, ".thumb.webp$1"));
          boardColor = dominantColor(thumb, boardColor);
        } catch {
          /* keep the brand gold */
        }
      }
    }
    const caps = track(canvasTexture(drawCartonBoard(boardColor, true), renderer, true, anisotropy));
    const sides = track(canvasTexture(drawCartonBoard(boardColor, false), renderer, true, anisotropy));

    // 4. geometry
    const biscuitGeometry = track(createBiscuitGeometry(BISCUIT_DETAIL[quality]));
    const sachetGeometry = track(createSachetGeometry(SACHET_DETAIL[quality]));
    const cartonGeometry = track(createCartonGeometry());
    tick();

    // 5. materials
    const biscuitTopMaterial = track(
      new MeshStandardMaterial({
        name: "biscuit-top",
        map: biscuitTop ?? relief.color,
        normalMap: relief.normal,
        normalScale: new Vector2(1.15, 1.15),
        displacementMap: relief.height,
        displacementScale: BISCUIT_DISPLACEMENT,
        displacementBias: -BISCUIT_DISPLACEMENT * 0.5,
        roughness: 0.74,
        metalness: 0,
        envMapIntensity: 0.75,
      }),
    );
    const biscuitBodyMaterial = track(
      new MeshStandardMaterial({
        name: "biscuit-body",
        map: relief.color,
        roughness: 0.82,
        metalness: 0,
        color: new Color("#f0dcc0"),
        envMapIntensity: 0.6,
      }),
    );

    const filmOptions = {
      name: "sachet-film",
      map: front,
      roughness: 0.24,
      metalness: 0.04,
      side: FrontSide,
      envMapIntensity: 1.15,
    };
    const sachetOuter = track(
      quality === "low"
        ? new MeshStandardMaterial(filmOptions)
        : new MeshPhysicalMaterial({ ...filmOptions, clearcoat: 0.8, clearcoatRoughness: 0.12 }),
    );
    // front and back films share one geometry: the `labelSide` attribute picks the label
    (sachetOuter as MeshStandardMaterial).onBeforeCompile = (shader) => {
      shader.uniforms.backMap = { value: back };
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <map_pars_fragment>", "#include <map_pars_fragment>\nuniform sampler2D backMap;\nvarying float vSachetSide;")
        .replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
            vec4 sampledDiffuseColor = vSachetSide > 0.0 ? texture2D( map, vMapUv ) : texture2D( backMap, vMapUv );
            diffuseColor *= sampledDiffuseColor;
          #endif`,
        );
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float labelSide;\nvarying float vSachetSide;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvSachetSide = labelSide;");
    };
    (sachetOuter as MeshStandardMaterial).customProgramCacheKey = () => "krumbz-sachet-film";

    const sachetInner = track(
      new MeshStandardMaterial({
        name: "sachet-inner",
        color: new Color("#d6d4cf"),
        metalness: 0.95,
        roughness: 0.32,
        side: BackSide,
        envMapIntensity: 0.9,
      }),
    );

    const cartonLabelMaterial = track(
      new MeshStandardMaterial({ name: "carton-label", map: label, roughness: 0.58, metalness: 0, envMapIntensity: 0.7 }),
    );
    const cartonCaps = track(new MeshStandardMaterial({ name: "carton-caps", map: caps, roughness: 0.7, envMapIntensity: 0.6 }));
    const cartonSides = track(new MeshStandardMaterial({ name: "carton-sides", map: sides, roughness: 0.7, envMapIntensity: 0.6 }));
    tick();

    return {
      quality,
      biscuit: { geometry: biscuitGeometry, materials: [biscuitTopMaterial, biscuitBodyMaterial] },
      sachet: { geometry: sachetGeometry, outer: sachetOuter, inner: sachetInner },
      carton: { geometry: cartonGeometry, materials: [cartonLabelMaterial, cartonCaps, cartonSides] },
      environment: envTarget.texture,
      dispose: () => {
        disposeAll();
        disposeTextureLoaders();
      },
    };
  } catch (error) {
    disposeAll();
    throw error;
  }
}
