import { SCENE_IDS } from "@/lib/assets/registry";

/**
 * Scroll ↔ 3D contract (home page).
 *
 * The home page renders, in this exact order, one element per stage:
 *
 *   <section data-stage="<id>"> … <div data-stage-anchor="<id>" aria-hidden /> … </section>
 *
 * - `data-stage` marks the scroll range of the stage (used by ScrollTrigger).
 * - `data-stage-anchor` is an empty, absolutely/relatively positioned box that
 *   marks where (and how big) the products should appear on screen. The fixed
 *   WebGL canvas projects the products onto the anchor rectangle and
 *   interpolates between consecutive anchors while scrolling.
 *
 * Pages other than home may render a single anchor with `data-stage-anchor`
 * and a stage id from this list to place the products (e.g. "cta").
 */
export const STAGE_IDS = ["intro", ...SCENE_IDS, "benefits", "products", "cta"] as const;
export type StageId = (typeof STAGE_IDS)[number];

export const STAGE_ATTR = "data-stage";
export const STAGE_ANCHOR_ATTR = "data-stage-anchor";

export function isStageId(value: string): value is StageId {
  return (STAGE_IDS as readonly string[]).includes(value);
}
