import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";

/**
 * Pillow-pack sachet (flow-wrap): a flat film tube puffed by its content,
 * crimped transverse seals with pinked (zig-zag) edges at top and bottom,
 * a longitudinal fin seal folded on the back, concave sides and corner creases.
 *
 * Model units: width 1, height 1.5 (label ratio 2:3), front faces +Z.
 * UVs: the front label covers the whole front (fins included), the back label
 * the whole back (mirrored so it reads correctly from behind).
 *
 * Opening (0 → 1) is stored as relative morph targets at 1/3, 2/3 and 1:
 * the top seal peels apart, the front lip curls forward, the back lip
 * backward, the mouth takes an eye shape while the side folds stay closed.
 * Drive it with `sachetOpenInfluences(open, mesh.morphTargetInfluences)`.
 */
export const SACHET_WIDTH = 1;
export const SACHET_HEIGHT = 1.5;
const HALF_W = SACHET_WIDTH / 2;
const HALF_H = SACHET_HEIGHT / 2;
/** Height of each crimped seal. */
const SEAL = 0.105;
/** Half height of the puffed body. */
const BODY = HALF_H - SEAL;
/** Maximum half thickness of the puffed body. */
const PUFF = 0.165;
/** Where the peel opening starts (y, model units). */
const OPEN_FROM = 0.3;
/** Interior point where biscuits wait before coming out (model units). */
export const SACHET_INSIDE: readonly [number, number, number] = [0, 0.05, 0];
/** Height of the mouth once open (model units). */
export const SACHET_MOUTH_Y = 0.62;

export interface SachetDetail {
  columns: number;
  bodyRows: number;
}
export const SACHET_DETAIL: Record<"low" | "mid" | "high", SachetDetail> = {
  low: { columns: 64, bodyRows: 60 },
  mid: { columns: 80, bodyRows: 76 },
  high: { columns: 96, bodyRows: 92 },
};

const OPEN_KEYS = [1 / 3, 2 / 3, 1];

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

interface SurfaceSample {
  /** -0.5 … 0.5 across the width, before the puff pinch. */
  x: number;
  y: number;
  /** +1 front, -1 back. */
  side: 1 | -1;
  /** Extra outward offset (back fin). */
  lift: number;
}

/** Position of a film point for a given opening amount. */
function filmPoint(sample: SurfaceSample, open: number, teeth: number, out: Vector3): Vector3 {
  const { x, y, side, lift } = sample;
  const ay = Math.abs(y);
  const t = Math.min(1, ay / BODY);
  // body puff along the height (vertical tangent where the film meets the seals)
  const b = ay >= BODY ? 0 : Math.pow(1 - Math.pow(t, 3), 0.7);
  const s = Math.min(1, Math.abs(2 * x));
  const c = Math.pow(Math.max(0, 1 - Math.pow(s, 2.2)), 0.55);
  let z = PUFF * b * c;

  // gentle film undulation + diagonal creases at the pinched corners
  z *= 1 + 0.03 * Math.sin(x * 9 + y * 5) * Math.sin(y * 7 + 1.3);
  const corner = smoothstep(0.55, 0.95, t) * smoothstep(0.45, 0.95, s) * (1 - smoothstep(0.97, 1, t));
  z += corner * Math.sin((s * 0.8 + t * 1.1) * 38) * 0.011;

  // fins: both films pressed together, crimped with vertical serrations
  const fin = smoothstep(BODY - 0.004, BODY + 0.012, ay);
  // front and back films meet exactly on the side folds
  const edgeTaper = 1 - smoothstep(0.94, 1, s);
  const crimp = fin * (0.0035 * Math.sin(x * Math.PI * 2 * (teeth / 2)) + 0.006 * Math.sin(x * 6.3 + y) * fin);
  z = side * (z + 0.0022 * (1 - b) * edgeTaper) + crimp + side * lift;

  // the film is inextensible: puffing pulls the side folds inwards
  let px = x * (1 - 0.055 * b);
  let py = y;

  // peel opening: curl both lips apart above OPEN_FROM, sides stay sealed
  if (open > 0 && y > OPEN_FROM) {
    const L = y - OPEN_FROM;
    const m = Math.pow(Math.max(0, 1 - s * s), 0.9);
    const k = open * m * (side > 0 ? 4.2 : 2.7);
    if (k > 1e-4) {
      const dy = Math.sin(k * L) / k - L;
      const dz = (1 - Math.cos(k * L)) / k;
      py += dy;
      z += dz * side;
      // the lip spreads slightly sideways as it opens
      px *= 1 + 0.04 * open * smoothstep(0, 0.4, L) * m;
    }
  }
  return out.set(px, py, z);
}

/** Morph influences for an opening amount (piecewise-linear between keys). */
export function sachetOpenInfluences(open: number, influences: number[] | undefined) {
  if (!influences) return;
  const o = Math.min(1, Math.max(0, open));
  influences.fill(0);
  let prevKey = 0;
  for (let i = 0; i < OPEN_KEYS.length; i++) {
    const key = OPEN_KEYS[i];
    if (o <= key) {
      const f = (o - prevKey) / (key - prevKey);
      if (i > 0) influences[i - 1] = 1 - f;
      influences[i] = f;
      return;
    }
    prevKey = key;
  }
  influences[OPEN_KEYS.length - 1] = 1;
}

export function createSachetGeometry(detail: SachetDetail = SACHET_DETAIL.mid): BufferGeometry {
  const { columns, bodyRows } = detail;
  const teeth = columns / 2;
  const finRows = 6;
  const samples: SurfaceSample[] = [];
  const uvs: number[] = [];
  /** +1 on the front film, -1 on the back (selects the label in the shader). */
  const sides: number[] = [];
  const indices: number[] = [];

  // Row parameters: bottom fin, body (clustered towards the seals), top fin.
  const rowY = (j: number, column: number): number => {
    const toothDepth = column % 2 === 1 ? 0.017 : 0;
    if (j < finRows) {
      const f = j / finRows;
      const edge = -HALF_H + toothDepth;
      return edge + (-BODY - edge) * f;
    }
    const jb = j - finRows;
    if (jb <= bodyRows) {
      const f = jb / bodyRows;
      return -BODY + BODY * (1 - Math.cos(Math.PI * f));
    }
    const f = (jb - bodyRows) / finRows;
    const edge = HALF_H - toothDepth;
    return BODY + (edge - BODY) * f;
  };
  const rows = finRows * 2 + bodyRows + 1;

  const addSheet = (side: 1 | -1, xFrom: number, xTo: number, cols: number, lift: (u: number, y: number) => number) => {
    const start = samples.length;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i <= cols; i++) {
        const u = i / cols;
        const x = xFrom + (xTo - xFrom) * u;
        const column = Math.round((x + HALF_W) * columns);
        const y = rowY(j, column);
        samples.push({ x, y, side, lift: lift(u, y) });
        uvs.push(side > 0 ? x + 0.5 : 0.5 - x, (y + HALF_H) / SACHET_HEIGHT);
        sides.push(side);
      }
    }
    const stride = cols + 1;
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols; i++) {
        const a = start + j * stride + i;
        const b = a + 1;
        const c = a + stride + 1;
        const d = a + stride;
        indices.push(a, b, c, a, c, d);
      }
    }
  };

  // Front (x: -0.5 → 0.5) faces +Z, back (x: 0.5 → -0.5) faces -Z.
  addSheet(1, -HALF_W, HALF_W, columns, () => 0);
  addSheet(-1, HALF_W, -HALF_W, columns, () => 0);
  // Longitudinal fin seal folded flat on the back (a low ridge).
  addSheet(-1, 0.045, -0.045, 4, (u, y) => {
    const ridge = Math.sin(u * Math.PI);
    return 0.0045 * ridge * (1 - smoothstep(BODY - 0.02, BODY + 0.01, Math.abs(y)));
  });

  const count = samples.length;
  const v = new Vector3();
  const build = (open: number) => {
    const array = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      filmPoint(samples[i], open, teeth, v);
      array[i * 3] = v.x;
      array[i * 3 + 1] = v.y;
      array[i * 3 + 2] = v.z;
    }
    return array;
  };
  const normalsFor = (positions: Float32Array) => {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    const n = g.getAttribute("normal").array as Float32Array;
    g.dispose();
    return n;
  };

  const basePositions = build(0);
  const baseNormals = normalsFor(basePositions);

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(basePositions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(baseNormals, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("labelSide", new Float32BufferAttribute(sides, 1));
  geometry.setIndex(indices);

  const morphPositions: Float32BufferAttribute[] = [];
  const morphNormals: Float32BufferAttribute[] = [];
  for (const key of OPEN_KEYS) {
    const p = build(key);
    const n = normalsFor(p);
    for (let i = 0; i < p.length; i++) {
      p[i] -= basePositions[i];
      n[i] -= baseNormals[i];
    }
    morphPositions.push(new Float32BufferAttribute(p, 3));
    morphNormals.push(new Float32BufferAttribute(n, 3));
  }
  geometry.morphAttributes.position = morphPositions;
  geometry.morphAttributes.normal = morphNormals;
  geometry.morphTargetsRelative = true;
  geometry.computeBoundingBox();
  // the opened lips reach further: enlarge bounds so culling stays correct
  geometry.boundingBox!.max.z += 0.35;
  geometry.boundingBox!.min.z -= 0.25;
  geometry.computeBoundingSphere();
  geometry.boundingSphere!.radius += 0.3;
  return geometry;
}
