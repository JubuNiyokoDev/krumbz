import type { SceneId } from "./registry";

/**
 * Per-scene framing of the life-moment photos (home page).
 *
 * Boxes are measured on the landscape files (public/images/scenes/*-paysage.jpg)
 * in % of the image: [x0, y0, x1, y1]. Each photo has its people on one side and
 * a calm "free" side (wall, lawn, lake) for the copy and the 3D product.
 *
 * Phones (portrait screens, no -portrait.jpg yet): the landscape photo is shown
 * in a full-width band whose height and object-position are COMPUTED from the
 * boxes so that every face and the Krumbz sachet stay inside the frame
 * (see `mobileFraming`). As soon as a real `-portrait.jpg` exists, it is used
 * full-screen instead and these mobile numbers are ignored.
 *
 * Wide screens: `wide` is the object-position, `copy` the copy column width (vw)
 * and `anchor` the 3D product box (centre in vw/svh, size in svh), on the free side.
 *
 * tests/scene-framing.spec.ts checks, at 390×844 and 1440×900, that every box is
 * visible and that neither the copy nor the 3D anchor covers a face or the sachet.
 */
export type Box = readonly [x0: number, y0: number, x1: number, y1: number];

export interface SceneFraming {
  freeSide: "left" | "right";
  faces: readonly Box[];
  sachet: Box;
  wide: string;
  copy: { width: number };
  anchor: { cx: number; cy: number; size: number };
}

/** Aspect ratio of the landscape scene files (1672 × 941). */
export const SCENE_ASPECT = 1672 / 941;

export const SCENE_FRAMING: Record<SceneId, SceneFraming> = {
  "couple-jardin": {
    freeSide: "right",
    faces: [
      [15, 14, 27, 37],
      [37, 7, 55, 35],
    ],
    sachet: [42, 64, 54, 93],
    wide: "0% 45%",
    copy: { width: 30 },
    anchor: { cx: 86, cy: 70, size: 28 },
  },
  "famille-maison": {
    freeSide: "left",
    faces: [
      [48, 12, 58, 32],
      [58, 28, 70, 48],
      [80, 7, 93, 30],
      [83, 30, 95, 50],
    ],
    sachet: [73, 68, 82, 88],
    wide: "100% 45%",
    copy: { width: 30 },
    anchor: { cx: 17, cy: 72, size: 28 },
  },
  "classe-enseignant": {
    freeSide: "right",
    faces: [
      [11, 2, 25, 30],
      [25, 30, 35, 48],
      [37, 32, 47, 47],
      [54, 40, 62, 55],
      [30, 52, 44, 72],
      [42, 48, 52, 63],
      [55, 55, 67, 72],
    ],
    sachet: [41, 70, 52, 95],
    wide: "100% 45%",
    copy: { width: 28 },
    anchor: { cx: 84, cy: 72, size: 28 },
  },
  anniversaire: {
    freeSide: "left",
    faces: [
      [26, 34, 38, 60],
      [37, 9, 50, 36],
      [52, 21, 63, 48],
      [69, 35, 77, 55],
      [79, 3, 92, 30],
      [86, 30, 100, 52],
    ],
    sachet: [59, 62, 72, 90],
    wide: "100% 45%",
    // The free wall is only ~14 % wide: narrow copy column, kept left of the girl's face.
    copy: { width: 14 },
    anchor: { cx: 9, cy: 79, size: 22 },
  },
  mariage: {
    freeSide: "right",
    faces: [
      [9, 9, 22, 35],
      [20, 9, 30, 30],
      [34, 14, 42, 38],
      [50, 18, 60, 40],
    ],
    sachet: [50, 64, 58, 86],
    wide: "0% 45%",
    copy: { width: 28 },
    anchor: { cx: 85, cy: 72, size: 28 },
  },
  "pause-bureau": {
    freeSide: "left",
    faces: [
      [52, 7, 66, 35],
      [82, 3, 97, 32],
    ],
    sachet: [49, 66, 59, 86],
    wide: "100% 45%",
    copy: { width: 30 },
    anchor: { cx: 17, cy: 72, size: 28 },
  },
  "amis-sortie": {
    freeSide: "right",
    faces: [
      [2, 24, 18, 50],
      [15, 11, 24, 32],
      [28, 17, 40, 42],
      [42, 21, 53, 48],
    ],
    sachet: [27, 62, 37, 86],
    wide: "0% 45%",
    copy: { width: 26 },
    anchor: { cx: 86, cy: 72, size: 26 },
  },
};

/** Horizontal margin kept around the faces/sachet on phones, in % of the image width. */
const MOBILE_MARGIN = 2;

/**
 * Phone band for a landscape photo: the smallest visible width that contains
 * every face and the sachet (plus a margin), expressed as
 * - `bandVw`: band height in vw (independent of the phone's aspect ratio),
 * - `focus`: the object-position that centres those boxes.
 */
export function mobileFraming(f: SceneFraming): { bandVw: number; focus: string; keep: readonly [number, number] } {
  const boxes = [...f.faces, f.sachet];
  const x0 = Math.max(0, Math.min(...boxes.map((b) => b[0])) - MOBILE_MARGIN);
  const x1 = Math.min(100, Math.max(...boxes.map((b) => b[2])) + MOBILE_MARGIN);
  const visible = (x1 - x0) / 100;
  // A band of width W and height H shows W / (H · aspect) of the image width.
  const bandVw = 100 / (visible * SCENE_ASPECT);
  const x = visible >= 1 ? 50 : x0 / (1 - visible);
  return { bandVw: Math.round(bandVw * 10) / 10, focus: `${Math.round(Math.min(100, x) * 10) / 10}% 50%`, keep: [x0, x1] };
}
