/**
 * Scroll ↔ 3D contract (home page).
 *
 * The home page renders, in this exact order, one element per stage:
 *
 *   <section data-stage="<id>"> … <div data-stage-anchor="<id>" data-stage-pose="<pose>" aria-hidden /> … </section>
 *
 * - `data-stage` marks the scroll range of the stage (used by ScrollTrigger).
 * - `data-stage-anchor` is an empty, absolutely/relatively positioned box that
 *   marks where (and how big) the products should appear on screen. The fixed
 *   WebGL canvas projects the products onto the anchor rectangle and
 *   interpolates between consecutive anchors while scrolling.
 * - `data-stage-pose` (optional, default = the anchor id) names the composition
 *   of src/components/three/poses.ts used for that stage: a shop's scenes have
 *   their own ids but reuse the Krumbz compositions.
 *
 * Stage ids are free: "intro" comes first, then the life-moment scenes in
 * document order, then "benefits", "products" and "cta".
 * Pages other than home may render a single anchor (e.g. "cta").
 */
export type StageId = string;

/** Fixed stages around the life-moment scenes, in journey order. */
export const FIXED_STAGES = ["intro", "benefits", "products", "cta"] as const;

export const STAGE_ATTR = "data-stage";
export const STAGE_ANCHOR_ATTR = "data-stage-anchor";
export const STAGE_POSE_ATTR = "data-stage-pose";

export function isStageId(value: string): value is StageId {
  return value.length > 0;
}

/** Journey rank of a stage: intro (−1), scenes (0, document order breaks ties), benefits, products, cta. */
export function stageRank(id: StageId): number {
  if (id === "intro") return -1;
  if (id === "benefits") return 1;
  if (id === "products") return 2;
  if (id === "cta") return 3;
  return 0;
}
