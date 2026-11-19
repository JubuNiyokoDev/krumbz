import { BufferGeometry, Float32BufferAttribute } from "three";

/** Biscuit dimensions in model units (diameter 1). */
export const BISCUIT_RADIUS = 0.5;
export const BISCUIT_THICKNESS = 0.085;
/** Displacement amplitude for the baked height map (0.5 = neutral). */
export const BISCUIT_DISPLACEMENT = 0.024;

export interface BiscuitDetail {
  /** Rings on the flat top (displaced by the height map). */
  rings: number;
  /** Segments around. */
  segments: number;
}

export const BISCUIT_DETAIL: Record<"low" | "mid" | "high", BiscuitDetail> = {
  low: { rings: 40, segments: 96 },
  mid: { rings: 56, segments: 128 },
  high: { rings: 72, segments: 160 },
};

interface ProfilePoint {
  r: number;
  y: number;
  /** Normal in the (radial, y) plane. */
  nr: number;
  ny: number;
}

/**
 * Round biscuit with a rounded golden top edge and a tighter bottom edge.
 * Built as a lathe of a profile with planar UVs (disc fills the texture) so
 * the baked relief maps line up with the geometry.
 *
 * Material groups: 0 = top (colour + normal + displacement maps),
 * 1 = side wall and bottom (colour only).
 * Facing: top = +Y. Rotate X by +π/2 to face the camera with MARIE upright.
 */
export function createBiscuitGeometry(detail: BiscuitDetail = BISCUIT_DETAIL.mid): BufferGeometry {
  const R = BISCUIT_RADIUS;
  const half = BISCUIT_THICKNESS / 2;
  const topRadius = 0.032; // rounded top edge
  const bottomRadius = 0.014;
  const { rings, segments } = detail;

  const top: ProfilePoint[] = [];
  const flatEnd = R - topRadius;
  // ring 0 is the centre (handled as a fan)
  for (let i = 1; i <= rings; i++) {
    // slightly denser towards the border, where the bead ring and scallops are
    top.push({ r: flatEnd * Math.pow(i / rings, 0.85), y: half, nr: 0, ny: 1 });
  }
  const arcSteps = 9;
  for (let i = 1; i <= arcSteps; i++) {
    const a = (Math.PI / 2) * (1 - i / arcSteps); // 90° → 0°
    top.push({
      r: flatEnd + Math.cos(a) * topRadius,
      y: half - topRadius + Math.sin(a) * topRadius,
      nr: Math.cos(a),
      ny: Math.sin(a),
    });
  }

  const body: ProfilePoint[] = [];
  body.push({ r: R, y: half - topRadius, nr: 1, ny: 0 });
  body.push({ r: R, y: -half + bottomRadius, nr: 1, ny: 0 });
  const bArc = 5;
  for (let i = 1; i <= bArc; i++) {
    const a = -(Math.PI / 2) * (i / bArc); // 0° → -90°
    body.push({
      r: R - bottomRadius + Math.cos(a) * bottomRadius,
      y: -half + bottomRadius + Math.sin(a) * bottomRadius,
      nr: Math.cos(a),
      ny: Math.sin(a),
    });
  }
  const bottomRings = 6;
  for (let i = 1; i < bottomRings; i++) {
    const r = (R - bottomRadius) * (1 - i / bottomRings);
    body.push({ r, y: -half, nr: 0, ny: -1 });
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const pushVertex = (p: ProfilePoint, angle: number, mirrorUv: boolean) => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const x = p.r * c;
    const z = p.r * s;
    positions.push(x, p.y, z);
    normals.push(p.nr * c, p.ny, p.nr * s);
    uvs.push(0.5 + x / (2 * R), mirrorUv ? 0.5 + z / (2 * R) : 0.5 - z / (2 * R));
  };

  const ringStart: number[] = [];
  const addRing = (p: ProfilePoint, mirror: boolean) => {
    ringStart.push(positions.length / 3);
    for (let k = 0; k < segments; k++) pushVertex(p, (k / segments) * Math.PI * 2, mirror);
    return ringStart[ringStart.length - 1];
  };

  // Faces must be counter-clockwise seen from outside.
  const stitch = (inner: number, outer: number, flip: boolean) => {
    for (let k = 0; k < segments; k++) {
      const k1 = (k + 1) % segments;
      const a = inner + k;
      const b = inner + k1;
      const c = outer + k;
      const d = outer + k1;
      if (flip) indices.push(a, c, b, b, c, d);
      else indices.push(a, b, c, b, d, c);
    }
  };
  const fan = (center: number, ring: number, flip: boolean) => {
    for (let k = 0; k < segments; k++) {
      const k1 = (k + 1) % segments;
      if (flip) indices.push(center, ring + k, ring + k1);
      else indices.push(center, ring + k1, ring + k);
    }
  };

  // --- top group -----------------------------------------------------------
  const topCenter = positions.length / 3;
  positions.push(0, half, 0);
  normals.push(0, 1, 0);
  uvs.push(0.5, 0.5);
  let prev = addRing(top[0], false);
  fan(topCenter, prev, false);
  for (let i = 1; i < top.length; i++) {
    const ring = addRing(top[i], false);
    stitch(prev, ring, false);
    prev = ring;
  }
  const topCount = indices.length;

  // --- side + bottom group -------------------------------------------------
  prev = addRing(body[0], false);
  for (let i = 1; i < body.length; i++) {
    const p = body[i];
    const ring = addRing(p, p.ny < -0.5);
    stitch(prev, ring, false);
    prev = ring;
  }
  const bottomCenter = positions.length / 3;
  positions.push(0, -half, 0);
  normals.push(0, -1, 0);
  uvs.push(0.5, 0.5);
  fan(bottomCenter, prev, true);

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.addGroup(0, topCount, 0);
  geometry.addGroup(topCount, indices.length - topCount, 1);
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
}
