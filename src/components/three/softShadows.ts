"use client";

import { useEffect, useMemo } from "react";
import { CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, type Object3D } from "three";

/**
 * Soft contact shadows for floating products: one blurred elliptical blob per
 * object, lying on a floor plane slightly tilted towards the viewer. Size and
 * darkness follow the object's footprint and its height above the floor.
 *
 * Analytic on purpose: no extra depth/blur render passes (the render-to-texture
 * technique costs three scene renders per frame and cannot follow a
 * composition that is translated and scaled onto each scroll anchor).
 */
export interface ShadowCaster {
  object: Object3D | null;
  /** Footprint radius at scale 1 (model units). */
  radius: number;
  /** Half height at scale 1, to measure the gap to the floor. */
  halfHeight: number;
  /** Darkness multiplier (small stacked objects overlap: keep them lighter). */
  strength?: number;
}

export interface SoftShadowsHandle {
  group: Group;
  /** Recomputes every blob from the casters (call after moving them). */
  update: (casters: ShadowCaster[]) => void;
  dispose: () => void;
}

function blobTexture(color: string) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, color);
  g.addColorStop(0.35, `${color}b0`);
  g.addColorStop(0.7, `${color}38`);
  g.addColorStop(1, `${color}00`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function createSoftShadows(count: number, { floorY, tilt, opacity, color = "#5a2e0c", maxHeight = 1 }: { floorY: number; tilt: number; opacity: number; color?: string; maxHeight?: number }): SoftShadowsHandle {
  const group = new Group();
  group.name = "soft-shadows";
  group.position.y = floorY;
  group.rotation.x = tilt;
  const texture = blobTexture(color);
  const geometry = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const blobs: Mesh[] = [];
  for (let i = 0; i < count; i++) {
    const material = new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0, toneMapped: false });
    const mesh = new Mesh(geometry, material);
    mesh.renderOrder = -1;
    mesh.visible = false;
    group.add(mesh);
    blobs.push(mesh);
  }

  const update = (casters: ShadowCaster[]) => {
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);
    casters.forEach((caster, i) => {
      const blob = blobs[i];
      const o = caster.object;
      if (!blob) return;
      if (!o || !o.visible) {
        blob.visible = false;
        return;
      }
      const s = o.scale.x;
      // object position in the tilted floor frame (both live in the same parent)
      const dy = o.position.y - floorY;
      const dz = o.position.z;
      const localY = dy * cos + dz * sin;
      const localZ = -dy * sin + dz * cos;
      const gap = Math.max(0, localY - caster.halfHeight * s);
      const lift = Math.min(1, gap / maxHeight);
      const r = caster.radius * s * (1.15 + lift * 0.9);
      blob.visible = true;
      blob.position.set(o.position.x, 0.001 * i, localZ);
      blob.scale.set(r * 2, 1, r * 0.95);
      (blob.material as MeshBasicMaterial).opacity = opacity * (caster.strength ?? 1) * (1 - lift * 0.75) * Math.min(1, s * 4);
    });
  };

  const dispose = () => {
    texture.dispose();
    geometry.dispose();
    blobs.forEach((b) => (b.material as MeshBasicMaterial).dispose());
  };

  return { group, update, dispose };
}

/** React wrapper: creates the blob set and disposes it with the component. */
export function useSoftShadows(count: number, floorY: number, tilt: number, opacity: number): SoftShadowsHandle {
  const handle = useMemo(() => createSoftShadows(count, { floorY, tilt, opacity }), [count, floorY, tilt, opacity]);
  useEffect(() => () => handle.dispose(), [handle]);
  return handle;
}
