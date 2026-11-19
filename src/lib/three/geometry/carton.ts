import { BufferAttribute, BufferGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/** Carton dimensions in model units. Front and back are square (label halves are 1:1). */
export const CARTON_WIDTH = 1.1;
export const CARTON_HEIGHT = 1.1;
export const CARTON_DEPTH = 0.5;

/** Material groups of the carton geometry. */
export const CARTON_GROUP = { label: 0, caps: 1, sides: 2 } as const;

/**
 * Carton box with slightly rounded cardboard edges.
 * - group 0 (label): front (+Z) uses the left half of the 2:1 label, back (−Z)
 *   the right half (mirrored so it reads from behind);
 * - group 1 (caps): top and bottom, UVs (x, z) for the flap seam texture;
 * - group 2 (sides): left and right, UVs (z, y).
 */
export function createCartonGeometry(): BufferGeometry {
  const W = CARTON_WIDTH;
  const H = CARTON_HEIGHT;
  const D = CARTON_DEPTH;
  const source = new RoundedBoxGeometry(W, H, D, 3, 0.022);
  const geometry = source.index ? source.toNonIndexed() : source;
  if (geometry !== source) source.dispose();

  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const count = position.count;
  const uv = new Float32Array(count * 2);
  const faceGroup = new Uint8Array(count / 3);

  for (let f = 0; f < count / 3; f++) {
    // classify each triangle by its average normal
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let k = 0; k < 3; k++) {
      nx += normal.getX(f * 3 + k);
      ny += normal.getY(f * 3 + k);
      nz += normal.getZ(f * 3 + k);
    }
    const ax = Math.abs(nx);
    const ay = Math.abs(ny);
    const az = Math.abs(nz);
    let group: number;
    if (az >= ax && az >= ay) group = CARTON_GROUP.label;
    else if (ay >= ax) group = CARTON_GROUP.caps;
    else group = CARTON_GROUP.sides;
    faceGroup[f] = group;

    for (let k = 0; k < 3; k++) {
      const i = f * 3 + k;
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      let u: number;
      let v: number;
      if (group === CARTON_GROUP.label) {
        const fx = Math.min(1, Math.max(0, (x + W / 2) / W));
        u = nz >= 0 ? fx * 0.5 : 0.5 + (1 - fx) * 0.5;
        v = (y + H / 2) / H;
      } else if (group === CARTON_GROUP.caps) {
        u = (x + W / 2) / W;
        v = ny >= 0 ? (z + D / 2) / D : 1 - (z + D / 2) / D;
      } else {
        u = nx >= 0 ? 1 - (z + D / 2) / D : (z + D / 2) / D;
        v = (y + H / 2) / H;
      }
      uv[i * 2] = u;
      uv[i * 2 + 1] = v;
    }
  }

  // Re-order triangles by group so each material is a single draw range.
  const order: number[] = [];
  const groups: { start: number; count: number; materialIndex: number }[] = [];
  for (const g of [CARTON_GROUP.label, CARTON_GROUP.caps, CARTON_GROUP.sides]) {
    const start = order.length;
    for (let f = 0; f < faceGroup.length; f++) if (faceGroup[f] === g) order.push(f * 3, f * 3 + 1, f * 3 + 2);
    groups.push({ start, count: order.length - start, materialIndex: g });
  }

  const out = new BufferGeometry();
  const copy = (attr: BufferAttribute | { array: ArrayLike<number>; itemSize: number }, itemSize: number) => {
    const src = attr.array;
    const dst = new Float32Array(order.length * itemSize);
    order.forEach((vertex, i) => {
      for (let c = 0; c < itemSize; c++) dst[i * itemSize + c] = src[vertex * itemSize + c];
    });
    return new BufferAttribute(dst, itemSize);
  };
  out.setAttribute("position", copy(position as BufferAttribute, 3));
  out.setAttribute("normal", copy(normal as BufferAttribute, 3));
  out.setAttribute("uv", copy({ array: uv, itemSize: 2 }, 2));
  for (const g of groups) out.addGroup(g.start, g.count, g.materialIndex);
  out.computeBoundingBox();
  out.computeBoundingSphere();
  geometry.dispose();
  return out;
}
