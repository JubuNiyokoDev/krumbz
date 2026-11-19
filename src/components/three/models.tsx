"use client";

import { useMemo, type Ref } from "react";
import { Group, Mesh, type Object3D } from "three";
import type { ProductAssets } from "@/lib/three/assets";
import { sachetOpenInfluences } from "@/lib/three/geometry/sachet";

/**
 * Product meshes. They are created imperatively (Mesh constructor) so the
 * sachet's morph targets are registered, and marked `dispose={null}`:
 * geometries, materials and textures belong to ProductAssets, which disposes
 * them once for the whole canvas.
 */

export function SachetModel({ assets, ref }: { assets: ProductAssets; ref?: Ref<Group> }) {
  const group = useMemo(() => {
    const g = new Group();
    g.name = "sachet";
    const outer = new Mesh(assets.sachet.geometry, assets.sachet.outer);
    const inner = new Mesh(assets.sachet.geometry, assets.sachet.inner);
    outer.name = "sachet-film";
    inner.name = "sachet-inside";
    g.add(outer, inner);
    return g;
  }, [assets]);
  return <primitive ref={ref} object={group} dispose={null} />;
}

/** Applies the opening amount (0 → 1) to a SachetModel group. */
export function setSachetOpen(sachet: Object3D | null, open: number) {
  if (!sachet) return;
  for (const child of sachet.children) {
    if (child instanceof Mesh) sachetOpenInfluences(open, child.morphTargetInfluences);
  }
}

export function CartonModel({ assets, ref }: { assets: ProductAssets; ref?: Ref<Group> }) {
  return (
    <group ref={ref} name="carton" dispose={null}>
      <mesh geometry={assets.carton.geometry} material={assets.carton.materials} dispose={null} />
    </group>
  );
}

export function BiscuitModel({ assets, ref }: { assets: ProductAssets; ref?: Ref<Group> }) {
  return (
    <group ref={ref} name="biscuit" dispose={null}>
      <mesh geometry={assets.biscuit.geometry} material={assets.biscuit.materials} dispose={null} />
    </group>
  );
}

/** Warm studio: hand-built lights on top of the PMREM light-card environment. */
export function StudioLights() {
  return (
    <>
      <hemisphereLight args={["#fff2dc", "#8a5a2b", 0.55]} />
      <directionalLight position={[3.5, 5, 6]} intensity={2.1} color="#fff0d6" />
      <directionalLight position={[-6, 2.5, -2]} intensity={1.6} color="#f3c76b" />
      <directionalLight position={[4, -1, -5]} intensity={0.9} color="#ffe1b0" />
      <directionalLight position={[0, -4, 4]} intensity={0.35} color="#ffcf99" />
    </>
  );
}
