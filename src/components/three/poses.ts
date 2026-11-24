
/**
 * Per-stage product compositions for the home scroll journey.
 *
 * Space: "anchor units". The origin is the centre of the stage anchor
 * (`[data-stage-anchor]`) and 1 unit = min(anchor width, anchor height), so a
 * composition designed inside the [-0.5, 0.5] box fills the anchor.
 * X right, Y up, Z towards the viewer.
 *
 * Rotations are Euler angles in "ZXY" order: `r[1]` (Y) spins the object
 * about its own axis first, then `r[0]` (X) tips it, then `r[2]` (Z) leans it
 * in the screen plane. A biscuit with r = [π/2, 0, 0] faces the camera with
 * MARIE upright; the sachet and the carton face the camera at r = 0.
 *
 * Model sizes (scale 1): sachet 1 × 1.5, carton 1.1 × 1.1 × 0.5, biscuit Ø 1.
 */
export type Vec3 = [number, number, number];

export interface ObjectPose {
  p: Vec3;
  r: Vec3;
  s: number;
  /** Visibility 0 → 1 (hidden objects shrink to nothing where they are). */
  v: number;
}

export interface Composition {
  sachet: ObjectPose;
  carton: ObjectPose;
  biscuits: ObjectPose[];
  /** Sachet opening 0 (sealed) → 1 (peeled open). */
  open: number;
}

export interface PoseContext {
  /** Seconds since the scene started (idle motions). */
  time: number;
  /** Scroll progress through the stage's section, 0 → 1. */
  progress: number;
  /** Intro auto-play progress 0 → 1 (1 once played). */
  intro: number;
}

export const BISCUIT_COUNT = 6;
const HALF_PI = Math.PI / 2;
const SACHET_H = 1.5;

const pose = (p: Vec3, r: Vec3 = [0, 0, 0], s = 1, v = 1): ObjectPose => ({ p, r, s, v });

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const range = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutBack = (x: number) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

/** Point inside the sachet (where hidden biscuits wait), in anchor units. */
function insideSachet(sachet: ObjectPose, depth = 0): Vec3 {
  return [sachet.p[0], sachet.p[1] + 0.05 * sachet.s * SACHET_H, sachet.p[2] + depth];
}

/** Hidden biscuit tucked inside the sachet. */
function tucked(sachet: ObjectPose, i: number): ObjectPose {
  return pose(insideSachet(sachet, (i - 2.5) * 0.006), [HALF_PI + sachet.r[0], sachet.r[1], sachet.r[2]], 0.3, 0);
}

function withTucked(sachet: ObjectPose, carton: ObjectPose, open: number, visible: ObjectPose[]): Composition {
  const biscuits: ObjectPose[] = [];
  for (let i = 0; i < BISCUIT_COUNT; i++) biscuits.push(visible[i] ?? tucked(sachet, i));
  return { sachet, carton, biscuits, open };
}

/** Hidden carton: shrinks behind the composition. */
const cartonAway = (x = 0.2, y = -0.05): ObjectPose => pose([x, y, -0.35], [0, -0.5, 0], 0.5, 0);

// -----------------------------------------------------------------------------

function intro({ intro: t, time }: PoseContext): Composition {
  // 0 → 0.45: the sachet spins in; 0.35 → 0.7: it peels open; 0.55 → 1: a biscuit rises out
  const spin = easeOutCubic(range(t, 0, 0.45));
  const grow = easeOutBack(range(t, 0, 0.42));
  const open = easeInOutCubic(range(t, 0.35, 0.7));
  const rise = easeOutBack(range(t, 0.55, 1));
  const sway = Math.sin(time * 0.6) * 0.05;
  const sachet = pose([0, -0.06 - (1 - spin) * 0.25, 0], [0.04, -0.28 + (1 - spin) * -Math.PI * 2 + sway, 0.03], 0.56 * (0.25 + 0.75 * grow));
  const out = pose(
    [0.02, -0.02 + 0.44 * rise, 0.02],
    [HALF_PI - 0.12, -0.28 + 0.25 * rise + sway, -0.08 * rise],
    0.32,
    clamp01(range(t, 0.52, 0.62)),
  );
  return withTucked(sachet, cartonAway(), open, [out]);
}

function coupleJardin({ time }: PoseContext): Composition {
  // à deux: two biscuits leaning on each other next to the open sachet
  const sachet = pose([-0.22, -0.02, -0.08], [0.02, 0.42, 0.1], 0.5);
  const lean = Math.sin(time * 0.9) * 0.03;
  return withTucked(sachet, cartonAway(), 1, [
    pose([0.1, -0.12, 0.14], [HALF_PI - 0.05, -0.35, -0.24 + lean], 0.32),
    pose([0.29, -0.09, 0.08], [HALF_PI - 0.05, 0.4, 0.26 - lean], 0.32),
  ]);
}

function familleMaison({ time }: PoseContext): Composition {
  // en famille: carton behind, open sachet, a stack of four biscuits
  const carton = pose([0.27, 0.07, -0.36], [0.05, -0.55, 0], 0.48);
  const sachet = pose([-0.27, -0.04, 0.04], [0.02, 0.45, -0.06], 0.46);
  const stack: ObjectPose[] = [];
  for (let i = 0; i < 4; i++) {
    stack.push(pose([0.08 + Math.sin(i * 2.1) * 0.012, -0.36 + i * 0.033, 0.26], [0.5, i * 0.9 + time * 0.1, 0], 0.28));
  }
  return withTucked(sachet, carton, 1, stack);
}

function classeEnseignant({ time }: PoseContext): Composition {
  // en classe: the sachet "teaches" a class of five biscuits in two rows
  const sachet = pose([-0.35, 0.02, -0.04], [0, 0.55, 0.04], 0.44);
  const desk: ObjectPose[] = [];
  const seats: [number, number][] = [
    [0.02, 0.15],
    [0.22, 0.15],
    [0.42, 0.15],
    [0.12, -0.12],
    [0.32, -0.12],
  ];
  seats.forEach(([x, y], i) => {
    const bob = Math.sin(time * 1.6 + i * 1.3) * 0.012;
    desk.push(pose([x + 0.02, y + bob, 0.05 + (y < 0 ? 0.08 : 0)], [HALF_PI - 0.18, -0.25, Math.sin(i * 1.7) * 0.12], 0.19));
  });
  return withTucked(sachet, cartonAway(), 1, desk);
}

function anniversaire({ time, progress }: PoseContext): Composition {
  // anniversaire: a biscuit "cake" tower slowly turning on top of the carton
  const carton = pose([0.08, -0.27, -0.06], [0.12, -0.55, 0], 0.4);
  const sachet = pose([-0.34, -0.02, 0.06], [0.02, 0.6, -0.12], 0.4);
  const tower: ObjectPose[] = [];
  for (let i = 0; i < 5; i++) {
    tower.push(pose([0.08, -0.03 + i * 0.03, -0.04], [0.42, time * 0.35 + i * 0.6 + progress * 2, 0], 0.3 - i * 0.012));
  }
  return withTucked(sachet, carton, 1, tower);
}

function mariage({ time }: PoseContext): Composition {
  // mariage: two biscuits interlaced like rings above the carton, three orbiting
  const carton = pose([0, -0.26, -0.08], [0.1, -0.3, 0], 0.42);
  const sachet = pose([0, -0.18, -0.4], [0, 0, 0], 0.4, 0);
  const rings: ObjectPose[] = [
    pose([-0.075, 0.18, 0], [HALF_PI - 0.15, 0.55, -0.12], 0.29),
    pose([0.075, 0.18, 0.02], [HALF_PI - 0.15, -0.55, 0.12], 0.29),
  ];
  for (let i = 0; i < 3; i++) {
    const a = time * 0.5 + (i / 3) * Math.PI * 2;
    rings.push(pose([Math.cos(a) * 0.42, 0.14 + Math.sin(a * 2) * 0.05, Math.sin(a) * 0.22], [HALF_PI - 0.2, a * 1.5, 0], 0.11));
  }
  return withTucked(sachet, carton, 1, rings);
}

function pauseBureau({ time }: PoseContext): Composition {
  // au bureau: biscuits fanned like a hand of cards from the open sachet
  const sachet = pose([-0.26, -0.06, -0.04], [0.08, 0.32, -0.32], 0.45);
  const fan: ObjectPose[] = [];
  for (let i = 0; i < 4; i++) {
    const a = -0.65 + i * 0.42;
    fan.push(
      pose(
        [0.2 + Math.sin(a) * 0.2, Math.cos(a) * 0.12 - 0.04, 0.1 + i * 0.012],
        [HALF_PI - 0.12, -0.2 + Math.sin(time * 0.7 + i) * 0.04, -a * 0.9],
        0.28,
      ),
    );
  }
  return withTucked(sachet, cartonAway(), 1, fan);
}

function amisSortie({ time, progress }: PoseContext): Composition {
  // entre amis: six biscuits orbit the open sachet, shared around
  const sachet = pose([0, -0.04, 0], [0.04, -0.2 + Math.sin(time * 0.4) * 0.15, 0], 0.48);
  const orbit: ObjectPose[] = [];
  for (let i = 0; i < BISCUIT_COUNT; i++) {
    const a = time * 0.45 + progress * Math.PI + (i / BISCUIT_COUNT) * Math.PI * 2;
    orbit.push(
      pose(
        [Math.cos(a) * 0.46, -0.02 + Math.sin(a * 2 + i) * 0.06, Math.sin(a) * 0.26],
        [HALF_PI - 0.25, -a + 0.4, Math.sin(a) * 0.2],
        0.19,
      ),
    );
  }
  return withTucked(sachet, cartonAway(0, 0), 1, orbit);
}

/**
 * The 10 compositions below power the promotional scenes (small anchor,
 * tucked in the top band created above the photo — see scene-framing.ts):
 * simple, compact arrangements since the anchor itself is small on screen.
 */
function petitDejeuner({ time }: PoseContext): Composition {
  const sachet = pose([-0.1, -0.05, 0], [0.02, 0.4, -0.05], 0.5);
  return withTucked(sachet, cartonAway(), 1, [
    pose([0.22, 0.02, 0.1], [HALF_PI - 0.1, -0.3, 0.1 + Math.sin(time * 0.8) * 0.05], 0.3),
  ]);
}

function bibliotheque({ time }: PoseContext): Composition {
  const sachet = pose([0, -0.18, -0.1], [0.04, 0.2, 0], 0.4, 0);
  const stack: ObjectPose[] = [];
  for (let i = 0; i < 4; i++) {
    stack.push(pose([0, -0.3 + i * 0.09, 0.05], [0.55, i * 0.5 + time * 0.08, 0], 0.32));
  }
  return withTucked(sachet, cartonAway(), 0, stack);
}

function equipeSport({ time, progress }: PoseContext): Composition {
  const sachet = pose([0, -0.02, 0], [0.05, Math.sin(time * 0.6) * 0.2, 0], 0.42);
  const orbit: ObjectPose[] = [];
  for (let i = 0; i < 4; i++) {
    const a = time * 0.8 + progress * Math.PI + (i / 4) * Math.PI * 2;
    orbit.push(pose([Math.cos(a) * 0.4, Math.sin(a * 2) * 0.05, Math.sin(a) * 0.22], [HALF_PI - 0.2, -a, 0], 0.2));
  }
  return withTucked(sachet, cartonAway(0, 0), 1, orbit);
}

function reunionBureau({ time }: PoseContext): Composition {
  const sachet = pose([-0.2, -0.04, -0.02], [0.06, 0.3, -0.2], 0.4);
  const fan: ObjectPose[] = [];
  for (let i = 0; i < 3; i++) {
    const a = -0.4 + i * 0.4;
    fan.push(pose([0.16 + Math.sin(a) * 0.18, Math.cos(a) * 0.1, 0.08 + i * 0.01], [HALF_PI - 0.12, -a * 0.9 + Math.sin(time * 0.6 + i) * 0.03, 0], 0.24));
  }
  return withTucked(sachet, cartonAway(), 1, fan);
}

function marche({ time }: PoseContext): Composition {
  const sachet = pose([-0.16, -0.02, 0.04], [0.03, 0.35, -0.08], 0.46);
  return withTucked(sachet, cartonAway(), 1, [pose([0.2, 0.04 + Math.sin(time * 0.7) * 0.02, 0.1], [HALF_PI - 0.1, 0.2, 0], 0.3)]);
}

function champsAgriculteurs({ time }: PoseContext): Composition {
  const carton = pose([0.18, -0.08, -0.1], [0.1, -0.4, 0], 0.4);
  const sachet = pose([-0.2, -0.02, 0.05], [0.02, 0.4, -0.08], 0.42);
  const row: ObjectPose[] = [];
  for (let i = 0; i < 3; i++) {
    row.push(pose([-0.02 + i * 0.1, -0.22, 0.14], [0.5, time * 0.12 + i * 0.4, 0], 0.26));
  }
  return withTucked(sachet, carton, 1, row);
}

function panierCadeau({ time, progress }: PoseContext): Composition {
  const carton = pose([0, -0.26, -0.1], [0.1, -0.3, 0], 0.4);
  const tower: ObjectPose[] = [];
  for (let i = 0; i < 4; i++) {
    tower.push(pose([0.06, -0.08 + i * 0.03, -0.02], [0.4, time * 0.3 + i * 0.6 + progress * 1.5, 0], 0.28 - i * 0.01));
  }
  return withTucked(cartonAway(-0.18, -0.05), carton, 1, tower);
}

function roadTrip({ time }: PoseContext): Composition {
  const sachet = pose([-0.22, -0.04, 0], [0.03, 0.38, -0.05], 0.44);
  const row: ObjectPose[] = [];
  for (let i = 0; i < 3; i++) {
    const bob = Math.sin(time * 1.2 + i * 1.1) * 0.015;
    row.push(pose([0.06 + i * 0.13, 0.02 + bob, 0.08], [HALF_PI - 0.15, -0.2 + i * 0.15, 0], 0.24));
  }
  return withTucked(sachet, cartonAway(), 1, row);
}

function echangeBoutique({ time }: PoseContext): Composition {
  const lean = Math.sin(time * 0.9) * 0.03;
  return withTucked(
    pose([-0.18, -0.03, -0.06], [0.02, 0.4, 0.08], 0.46, 0),
    cartonAway(0.18, -0.04),
    1,
    [
      pose([-0.08, -0.08, 0.14], [HALF_PI - 0.05, -0.3, -0.2 + lean], 0.3),
      pose([0.1, -0.06, 0.1], [HALF_PI - 0.05, 0.35, 0.22 - lean], 0.3),
    ],
  );
}

function familleNoel({ time, progress }: PoseContext): Composition {
  const carton = pose([0, -0.24, -0.1], [0.1, -0.35, 0], 0.4);
  const rings: ObjectPose[] = [
    pose([-0.07, 0.04, 0], [HALF_PI - 0.15, 0.5, -0.1], 0.26),
    pose([0.07, 0.04, 0.02], [HALF_PI - 0.15, -0.5, 0.1], 0.26),
  ];
  for (let i = 0; i < 2; i++) {
    const a = time * 0.5 + progress * Math.PI + (i / 2) * Math.PI * 2;
    rings.push(pose([Math.cos(a) * 0.3, 0.1 + Math.sin(a * 2) * 0.04, Math.sin(a) * 0.18], [HALF_PI - 0.2, a * 1.3, 0], 0.16));
  }
  return withTucked(cartonAway(-0.16, 0), carton, 1, rings);
}

function benefits({ time }: PoseContext): Composition {
  // one large biscuit slowly turning: grazing light reveals the MARIE relief
  const sachet = pose([0, -0.1, -0.3], [0, 0, 0], 0.45, 0);
  const hero = pose([0, 0, 0], [HALF_PI - 0.32 + Math.sin(time * 0.3) * 0.12, Math.sin(time * 0.35) * 0.55, Math.sin(time * 0.22) * 0.05], 0.88);
  return withTucked(sachet, cartonAway(0, -0.1), 0.6, [hero]);
}

function products({ time }: PoseContext): Composition {
  // the range: sachet and carton side by side
  const sachet = pose([-0.25, 0.02, 0.06], [0.02, 0.3 + Math.sin(time * 0.45) * 0.06, 0.02], 0.52);
  const carton = pose([0.26, -0.06, -0.06], [0.06, -0.5 + Math.sin(time * 0.4 + 1) * 0.05, 0], 0.42);
  return withTucked(sachet, carton, 0, []);
}

function cta({ time }: PoseContext): Composition {
  // call to action: the sealed sachet, front-facing
  const sachet = pose([0, 0, 0], [0.02, Math.sin(time * 0.5) * 0.08, 0], 0.62);
  return withTucked(sachet, cartonAway(0, -0.1), 0, []);
}

const STAGES: Record<string, (ctx: PoseContext) => Composition> = {
  intro,
  "couple-jardin": coupleJardin,
  "famille-maison": familleMaison,
  "classe-enseignant": classeEnseignant,
  anniversaire,
  mariage,
  "pause-bureau": pauseBureau,
  "amis-sortie": amisSortie,
  "petit-dejeuner": petitDejeuner,
  bibliotheque,
  "equipe-sport": equipeSport,
  "reunion-bureau": reunionBureau,
  marche,
  "champs-agriculteurs": champsAgriculteurs,
  "panier-cadeau": panierCadeau,
  "road-trip": roadTrip,
  "echange-boutique": echangeBoutique,
  "famille-noel": familleNoel,
  benefits,
  products,
  cta,
};

/** Every composition name (life-moment scenes of Krumbz, reused by the other shops, + fixed stages). */
export const POSE_NAMES = Object.keys(STAGES);

/** Composition used for an unknown pose name. */
export const DEFAULT_POSE = "couple-jardin";

export function composeStage(pose: string, ctx: PoseContext): Composition {
  return (Object.hasOwn(STAGES, pose) ? STAGES[pose] : STAGES[DEFAULT_POSE])(ctx);
}

/** Composition shown by the product viewer for each model. */
export const VIEWER_MODELS = ["sachet", "carton", "biscuit"] as const;
export type ViewerModel = (typeof VIEWER_MODELS)[number];
