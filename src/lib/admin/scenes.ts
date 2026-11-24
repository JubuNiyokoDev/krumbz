/**
 * Life-moment scenes of a shop (tenant.scenes): validation, starter scenes, form helpers.
 * Pure: shared by the super-admin Server Actions, the creation script and the tests.
 */
import { DEFAULT_SCENE_FRAMING } from "../db/mappers.ts";
import { MAX_SCENES, MIN_SCENES, type SceneBox, type TemplateId, type TenantScene } from "../tenant/types.ts";
import { isMediaPath } from "./content.ts";

/** Compositions of the 3D journey (src/components/three/poses.ts); "" = chosen by position. */
export const POSE_NAMES = [
  "couple-jardin",
  "famille-maison",
  "classe-enseignant",
  "anniversaire",
  "mariage",
  "pause-bureau",
  "amis-sortie",
  "petit-dejeuner",
  "bibliotheque",
  "equipe-sport",
  "reunion-bureau",
  "marche",
  "champs-agriculteurs",
  "panier-cadeau",
  "road-trip",
  "echange-boutique",
  "famille-noel",
] as const;

export const SCENE_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

const inPercent = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100;

export function boxProblem(box: unknown): string | null {
  if (!Array.isArray(box) || box.length !== 4 || !box.every(inPercent)) return "4 nombres entre 0 et 100 attendus (x0,y0,x1,y1)";
  const [x0, y0, x1, y1] = box as number[];
  if (x1 <= x0 || y1 <= y0) return "x1 doit dépasser x0 et y1 dépasser y0";
  return null;
}

/** "10,12,30,40" → [10, 12, 30, 40], or null. */
export function parseBox(raw: string): SceneBox | null {
  const parts = raw.split(/[,;\s]+/).filter(Boolean).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  return parts as SceneBox;
}

export const formatBox = (box: readonly number[]) => box.join(",");

/** Validation of a whole scene list; `template` "krumbz" may keep 0 scenes (its 17 built-in ones). */
export function scenesProblems(scenes: TenantScene[], template: TemplateId): string[] {
  const problems: string[] = [];
  const builtIn = template === "krumbz" && scenes.length === 0;
  if (!builtIn && scenes.length < MIN_SCENES) problems.push(`Au moins ${MIN_SCENES} scènes sont nécessaires (actuellement ${scenes.length}).`);
  if (scenes.length > MAX_SCENES) problems.push(`${MAX_SCENES} scènes au maximum.`);
  const seen = new Set<string>();
  scenes.forEach((scene, i) => {
    const n = `Scène ${i + 1}`;
    if (!SCENE_ID_PATTERN.test(scene.id)) problems.push(`${n} : identifiant invalide (minuscules, chiffres, tirets).`);
    else if (seen.has(scene.id)) problems.push(`${n} : identifiant « ${scene.id} » en double.`);
    seen.add(scene.id);
    if (!isMediaPath(scene.image.landscape)) problems.push(`${n} : photo paysage manquante ou chemin invalide.`);
    if (scene.image.portrait && !isMediaPath(scene.image.portrait)) problems.push(`${n} : chemin de la photo portrait invalide.`);
    if (scene.image.fallback && !isMediaPath(scene.image.fallback)) problems.push(`${n} : chemin du visuel provisoire invalide.`);
    if (!scene.label.fr.trim() || !scene.title.fr.trim()) problems.push(`${n} : libellé et titre en français obligatoires.`);
    const f = scene.framing;
    if (f.freeSide !== "left" && f.freeSide !== "right") problems.push(`${n} : côté libre « left » ou « right ».`);
    if (f.desktop && f.desktop !== "full" && f.desktop !== "card") problems.push(`${n} : mise en page « full » ou « card ».`);
    f.faces.forEach((box, j) => {
      const p = boxProblem(box);
      if (p) problems.push(`${n}, visage ${j + 1} : ${p}.`);
    });
    const sachet = boxProblem(f.sachet);
    if (sachet) problems.push(`${n}, produit : ${sachet}.`);
    if (!inPercent(f.copy.width) || f.copy.width < 8 || f.copy.width > 60) problems.push(`${n} : largeur du texte entre 8 et 60 (vw).`);
    if (!inPercent(f.anchor.cx) || !inPercent(f.anchor.cy) || !inPercent(f.anchor.size) || f.anchor.size < 5) {
      problems.push(`${n} : zone 3D (cx, cy, taille) entre 0 et 100, taille ≥ 5.`);
    }
    if (!/^[\w.% -]{1,40}$/.test(f.wide)) problems.push(`${n} : position large invalide (ex. « 0% 45% »).`);
    if (scene.pose && !(POSE_NAMES as readonly string[]).includes(scene.pose)) problems.push(`${n} : composition 3D inconnue.`);
  });
  return problems;
}

/** Framing of the starter scene n (people alternately on the left / right). */
export function starterFraming(index: number): TenantScene["framing"] {
  if (index % 2 === 0) return structuredClone(DEFAULT_SCENE_FRAMING);
  return {
    freeSide: "left",
    faces: [[50, 10, 90, 55]],
    sachet: [55, 55, 80, 90],
    wide: "100% 45%",
    copy: { width: 30 },
    anchor: { cx: 16, cy: 70, size: 28 },
  };
}

/** The MIN_SCENES starter scenes of a new shop (photos expected at /images/tenants/<slug>/scenes/). */
export function starterScenes(slug: string): TenantScene[] {
  return Array.from({ length: MIN_SCENES }, (_, i) => ({
    id: `scene-${i + 1}`,
    image: { landscape: `/images/tenants/${slug}/scenes/scene-${i + 1}-paysage.jpg`, portrait: null, fallback: null },
    label: { fr: `Moment ${i + 1}` },
    title: { fr: `[À remplacer] Titre du moment ${i + 1}` },
    text: { fr: "[À remplacer] Une phrase sur ce moment de vie." },
    alt: { fr: "[À remplacer] Description de la photo" },
    framing: starterFraming(i),
    pose: null,
  }));
}

/** Empty scene appended by the editor's « Ajouter » button. */
export function blankScene(slug: string, existing: TenantScene[]): TenantScene {
  let n = existing.length + 1;
  while (existing.some((s) => s.id === `scene-${n}`)) n++;
  return {
    id: `scene-${n}`,
    image: { landscape: `/images/tenants/${slug}/scenes/scene-${n}-paysage.jpg`, portrait: null, fallback: null },
    label: { fr: `Moment ${n}` },
    title: { fr: `[À remplacer] Titre du moment ${n}` },
    text: { fr: "" },
    alt: { fr: "" },
    framing: starterFraming(existing.length),
    pose: null,
  };
}
