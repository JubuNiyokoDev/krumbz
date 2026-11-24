import {
  Box3,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Shape,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type BufferGeometry,
  type Material,
  type Object3D,
  type Texture,
  type WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { journeyCast, type KitProduct } from "@/lib/storefront/kit";
import { createStudioEnvironment } from "./environment";
import { viewerProducts } from "./viewerProducts";

/**
 * Product assets of the shops WITHOUT bespoke 3D (everyone but Krumbz).
 *
 * - A product with an optimised glTF (`modelUrl`, Meshopt) is loaded and normalised.
 * - Otherwise its cut-out photo becomes a lit, slightly extruded, rounded card:
 *   a bevelled slab in the shop's background colour with the photo on its face.
 *
 * Orientations match the Krumbz models so that the SAME poses (poses.ts) apply:
 * - "upright" (sachet / carton roles, viewer): faces +Z at r = 0, like the sachet;
 * - "flat" (biscuit roles): lies in the XZ plane facing +Y, image top towards −Z,
 *   so that r = [π/2, 0, 0] faces the camera like a biscuit.
 */

/** A product object ready to be added to a scene, with its shadow footprint. */
export interface GenericObject {
  id: string;
  name: string;
  object: Group;
  /** Shadow footprint radius / half height at scale 1. */
  radius: number;
  halfHeight: number;
}

export interface GenericJourneyAssets {
  /** Sachet role (main product), carton role, biscuit roles. null = nothing to show. */
  main: GenericObject | null;
  second: GenericObject | null;
  biscuits: GenericObject[];
  environment: Texture;
  dispose(): void;
}

export interface GenericViewerAssets {
  items: GenericObject[];
  environment: Texture;
  dispose(): void;
}

interface LoadOptions {
  renderer: WebGLRenderer;
  products: KitProduct[];
  signal?: AbortSignal;
  onProgress?: (value: number) => void;
}

function cssColor(name: string, fallback: string): Color {
  if (typeof document === "undefined") return new Color(fallback);
  const value = getComputedStyle(document.body).getPropertyValue(name).trim();
  try {
    return new Color(value || fallback);
  } catch {
    return new Color(fallback);
  }
}

function roundedRect(width: number, height: number, radius: number): Shape {
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);
  const shape = new Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

const SLAB_DEPTH = 0.035;
const BEVEL = 0.014;

/** Shared resources of one loader run (disposed together). */
class Resources {
  private owned: { dispose(): void }[] = [];
  private textures = new Map<string, Promise<Texture | null>>();
  private models = new Map<string, Promise<Group | null>>();
  readonly slab: MeshStandardMaterial;
  readonly slabMissing: MeshStandardMaterial;
  private photoMaterials = new Map<Texture, MeshStandardMaterial>();
  private gltf: GLTFLoader | null = null;

  constructor(private signal?: AbortSignal) {
    this.slab = this.track(new MeshStandardMaterial({ color: cssColor("--color-cream", "#ffffff"), roughness: 0.62, metalness: 0 }));
    this.slabMissing = this.track(new MeshStandardMaterial({ color: cssColor("--color-gold", "#e2a23a"), roughness: 0.55, metalness: 0 }));
  }

  track<T extends { dispose(): void }>(item: T): T {
    this.owned.push(item);
    return item;
  }

  texture(url: string): Promise<Texture | null> {
    let hit = this.textures.get(url);
    if (!hit) {
      hit = new TextureLoader()
        .loadAsync(url)
        .then((texture) => {
          texture.colorSpace = SRGBColorSpace;
          texture.anisotropy = 4;
          return this.track(texture);
        })
        .catch((error: unknown) => {
          if (!this.signal?.aborted) console.warn(`[3d] photo indisponible : ${url}`, error);
          return null;
        });
      this.textures.set(url, hit);
    }
    return hit;
  }

  /** Normalised clone-able glTF scene (one load per URL). */
  model(url: string): Promise<Group | null> {
    let hit = this.models.get(url);
    if (!hit) {
      this.gltf ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      hit = this.gltf
        .loadAsync(url)
        .then((gltf) => {
          const root = gltf.scene;
          root.traverse((node) => {
            const mesh = node as Mesh;
            if (!mesh.isMesh) return;
            this.track(mesh.geometry);
            const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Material[];
            for (const material of materials) {
              this.track(material);
              for (const value of Object.values(material)) if ((value as Texture | null)?.isTexture) this.track(value as Texture);
            }
          });
          return root;
        })
        .catch((error: unknown) => {
          if (!this.signal?.aborted) console.warn(`[3d] modèle indisponible : ${url}`, error);
          return null;
        });
      this.models.set(url, hit);
    }
    return hit;
  }

  photoMaterial(texture: Texture): MeshStandardMaterial {
    let material = this.photoMaterials.get(texture);
    if (!material) {
      material = this.track(
        new MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.02, roughness: 0.55, metalness: 0, side: DoubleSide }),
      );
      this.photoMaterials.set(texture, material);
    }
    return material;
  }

  geometry<T extends BufferGeometry>(geometry: T): T {
    return this.track(geometry);
  }

  dispose() {
    for (const item of this.owned) item.dispose();
    this.owned = [];
  }
}

function imageAspect(texture: Texture | null): number {
  const image = texture?.image as { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number } | undefined;
  const w = image?.naturalWidth || image?.width || 1;
  const h = image?.naturalHeight || image?.height || 1;
  return w / h;
}

/** Upright rounded card fitting `boxW × boxH`, facing +Z, centred. */
function buildCard(res: Resources, texture: Texture | null, boxW: number, boxH: number): Group {
  const aspect = imageAspect(texture);
  const width = aspect >= boxW / boxH ? boxW : boxH * aspect;
  const height = aspect >= boxW / boxH ? boxW / aspect : boxH;
  const group = new Group();
  const slabGeometry = res.geometry(
    new ExtrudeGeometry(roundedRect(width, height, Math.min(width, height) * 0.09), {
      depth: SLAB_DEPTH,
      bevelEnabled: true,
      bevelThickness: BEVEL,
      bevelSize: BEVEL,
      bevelSegments: 3,
      curveSegments: 8,
    }),
  );
  slabGeometry.center();
  const slab = new Mesh(slabGeometry, texture ? res.slab : res.slabMissing);
  slab.name = "card-slab";
  group.add(slab);
  if (texture) {
    const face = new Mesh(res.geometry(new PlaneGeometry(width * 0.9, height * 0.9)), res.photoMaterial(texture));
    face.name = "card-photo";
    face.position.z = SLAB_DEPTH / 2 + BEVEL + 0.003;
    group.add(face);
  }
  return group;
}

/** glTF scene scaled to fit `boxW × boxH` (and depth ≤ boxW), centred on the origin. */
function fitModel(source: Group, boxW: number, boxH: number): { object: Group; halfHeight: number; radius: number } {
  const model = source.clone(true);
  model.updateMatrixWorld(true);
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const scale = Math.min(boxW / Math.max(size.x, 1e-6), boxH / Math.max(size.y, 1e-6), boxW / Math.max(size.z, 1e-6));
  const pivot = new Group();
  model.position.sub(center);
  pivot.add(model);
  pivot.scale.setScalar(scale);
  const object = new Group();
  object.add(pivot);
  return { object, halfHeight: (size.y * scale) / 2, radius: (Math.max(size.x, size.z) * scale) / 2 };
}

type Orientation = "upright" | "flat";

async function buildProduct(
  res: Resources,
  product: KitProduct,
  orientation: Orientation,
  box: { w: number; h: number },
  allowModel: boolean,
): Promise<GenericObject> {
  if (allowModel && product.modelUrl) {
    const source = await res.model(product.modelUrl);
    if (source) {
      const fitted = fitModel(source, box.w, box.h);
      fitted.object.name = product.id;
      return { id: product.id, name: product.name, ...fitted };
    }
  }
  const texture = product.image ? await res.texture(product.image) : null;
  const card = buildCard(res, texture, box.w, box.h);
  const object = new Group();
  object.name = product.id;
  if (orientation === "flat") card.rotation.x = -Math.PI / 2;
  object.add(card);
  const halfHeight = orientation === "flat" ? 0.06 : box.h / 2;
  return { id: product.id, name: product.name, object, radius: orientation === "flat" ? box.w / 2 : box.w * 0.5, halfHeight };
}

function cloneObject(item: GenericObject): GenericObject {
  return { ...item, object: item.object.clone(true) };
}

async function withEnvironment<T>(
  { renderer, signal, onProgress }: LoadOptions,
  res: Resources,
  tasks: (() => Promise<unknown>)[],
  build: () => T,
): Promise<T & { environment: Texture; dispose(): void }> {
  const env = res.track(createStudioEnvironment(renderer));
  let done = 0;
  onProgress?.(0.05);
  await Promise.all(
    tasks.map((task) =>
      task().then(() => {
        done++;
        onProgress?.(0.05 + (0.95 * done) / tasks.length);
      }),
    ),
  );
  if (signal?.aborted) {
    res.dispose();
    throw new DOMException("aborted", "AbortError");
  }
  onProgress?.(1);
  return { ...build(), environment: env.texture, dispose: () => res.dispose() };
}

/** Journey cast: main product (glTF or card) in the sachet's role, photo cards in the carton's and biscuits' roles. */
export async function createGenericJourneyAssets(options: LoadOptions & { biscuitCount: number }): Promise<GenericJourneyAssets> {
  const res = new Resources(options.signal);
  const cast = journeyCast(options.products, options.biscuitCount);
  let main: GenericObject | null = null;
  let second: GenericObject | null = null;
  const unique = new Map<string, GenericObject>();
  const tasks: (() => Promise<unknown>)[] = [];
  if (cast.main) {
    const product = cast.main;
    tasks.push(async () => {
      main = await buildProduct(res, product, "upright", { w: 1, h: 1.5 }, true);
    });
  }
  // Photo cards only: a product without a photo is never shown as an empty card.
  if (cast.second?.image) {
    const product = cast.second;
    tasks.push(async () => {
      second = await buildProduct(res, product, "upright", { w: 1.1, h: 1.1 }, false);
    });
  }
  const biscuits = cast.biscuits.filter((p) => p.image);
  for (const product of new Set(biscuits)) {
    tasks.push(async () => {
      unique.set(product.id, await buildProduct(res, product, "flat", { w: 1, h: 1 }, false));
    });
  }
  return withEnvironment(options, res, tasks, () => ({
    main,
    second,
    biscuits: biscuits.map((p, i) => {
      const item = unique.get(p.id)!;
      return i === biscuits.indexOf(p) ? item : cloneObject(item);
    }),
  }));
}

/** Viewer: one object per product (glTF if any, otherwise an upright photo card). */
export async function createGenericViewerAssets(options: LoadOptions): Promise<GenericViewerAssets> {
  const res = new Resources(options.signal);
  const products = viewerProducts(options.products);
  const items: (GenericObject | null)[] = products.map(() => null);
  const tasks = products.map((product, i) => async () => {
    items[i] = await buildProduct(res, product, "upright", { w: 1.25, h: 1.25 }, true);
  });
  return withEnvironment(options, res, tasks, () => ({ items: items.filter((item): item is GenericObject => item !== null) }));
}

/** Every Object3D of a journey cast (for shader warm-up). */
export function journeyObjects(assets: GenericJourneyAssets): Object3D[] {
  return [assets.main, assets.second, ...assets.biscuits].filter((x): x is GenericObject => x !== null).map((x) => x.object);
}
