import "server-only";
import { CONTENT_FIELDS, isMediaPath, MEDIA_FIELDS, setAtPath } from "@/lib/admin/content";
import { blankScene, parseBox } from "@/lib/admin/scenes";
import { COLOR_FIELDS, validateTheme } from "@/lib/admin/theme";
import { cleanText, formText, isHttpUrl, normalizeLocales, parseEmail, parseWhatsapp, toLocalized } from "@/lib/admin/validation";
import { FEATURE_KEYS } from "@/lib/db/mappers";
import {
  PALETTE_KEYS,
  PLATFORM_LOCALES,
  type PlatformLocale,
  type SceneBox,
  type TenantContact,
  type TenantFeatures,
  type TenantScene,
  type TenantTheme,
} from "@/lib/tenant/types";

/** Form → domain values shared by the creation wizard and the vendor pages. Field names are documented in the forms. */

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function fileOf(form: FormData, name: string): File | null {
  const value = form.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}

export function imageProblem(file: File | null, required = false): string | null {
  if (!file) return required ? "Choisissez une image." : null;
  if (file.size > MAX_IMAGE_BYTES) return "Image trop lourde (8 Mo maximum).";
  if (file.type && !file.type.startsWith("image/")) return "Ce fichier n'est pas une image (JPEG, PNG, WebP, AVIF).";
  return null;
}

export function parseLocales(form: FormData): PlatformLocale[] {
  return normalizeLocales(form.getAll("locales"));
}

/** Fields color.<key>, palette.<key> (empty = derived), fontDisplay, fontBody, radius. */
export function parseTheme(form: FormData, logoUrl: string | null, iconUrl: string | null = null): { theme: TenantTheme; errors: string[] } {
  const colors: Record<string, string> = {};
  for (const { key } of COLOR_FIELDS) colors[key] = formText(form, `color.${key}`, 7);
  const palette: Record<string, string> = {};
  for (const key of PALETTE_KEYS) palette[key] = formText(form, `palette.${key}`, 7);
  return validateTheme(
    { colors, palette, display: formText(form, "fontDisplay", 60), body: formText(form, "fontBody", 60), radius: formText(form, "radius", 10) },
    logoUrl,
    iconUrl,
  );
}

/** Fields whatsapp, email, phones (comma / new line separated), address, city, hours, mapUrl. */
export function parseContact(form: FormData, previous?: TenantContact): { contact: TenantContact; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  const whatsapp = parseWhatsapp(formText(form, "whatsapp", 30));
  if (!whatsapp) fields.whatsapp = "Numéro WhatsApp invalide : chiffres avec l'indicatif du pays, ex. 25768497372.";
  const rawEmail = formText(form, "email", 200);
  const email = rawEmail ? parseEmail(rawEmail) : null;
  if (rawEmail && !email) fields.email = "Adresse e-mail invalide.";
  const phones: string[] = [];
  for (const raw of formText(form, "phones", 300).split(/[,\n;]+/).map((p) => p.trim()).filter(Boolean)) {
    const digits = parseWhatsapp(raw);
    if (!digits) fields.phones = `Téléphone invalide : « ${raw} ».`;
    else phones.push(`+${digits}`);
  }
  const mapUrl = formText(form, "mapUrl", 500);
  if (mapUrl && !isHttpUrl(mapUrl)) fields.mapUrl = "Lien de carte invalide (https://…).";
  return {
    contact: {
      whatsapp: whatsapp ?? "",
      phones: phones.slice(0, 5),
      email,
      address: formText(form, "address", 200) || null,
      city: formText(form, "city", 80) || null,
      hours: formText(form, "hours", 200) || null,
      mapUrl: mapUrl || null,
      socials: previous?.socials ?? [],
    },
    fields,
  };
}

/** Checkboxes feature.<key>. */
export function parseFeatures(form: FormData): TenantFeatures {
  return Object.fromEntries(FEATURE_KEYS.map((key) => [key, form.get(`feature.${key}`) === "on"])) as TenantFeatures;
}

/**
 * Guided texts: fields content.<locale>.<key> for the known keys (CONTENT_FIELDS), stored at
 * content[locale].<key>. A field present in the form replaces the stored value (empty = removed,
 * i.e. French fallback / hidden section); every other key is kept.
 */
export function mergeContentForm(form: FormData, content: Record<string, unknown>): { content: Record<string, unknown>; fields: Record<string, string> } {
  let next = content;
  const fields: Record<string, string> = {};
  for (const field of CONTENT_FIELDS) {
    for (const locale of PLATFORM_LOCALES) {
      const raw = form.get(`content.${locale}.${field.key}`);
      if (raw === null) continue;
      const value = cleanText(raw, field.max);
      next = setAtPath(next, `${locale}.${field.key}`, value || null);
    }
  }
  return { content: next, fields };
}

/**
 * Section images (content.media): text fields media.<key> (lists: one path per line) and optional
 * uploads mediaFile.<key> (lists: mediaFile.<key>.<index>). Uploads are stored by `store`.
 */
export async function mergeMediaForm(
  form: FormData,
  content: Record<string, unknown>,
  store: (file: File) => Promise<string>,
): Promise<{ content: Record<string, unknown>; fields: Record<string, string> }> {
  const fields: Record<string, string> = {};
  const media: Record<string, unknown> = {};
  for (const field of MEDIA_FIELDS) {
    const raw = formText(form, `media.${field.key}`, 4000);
    if (field.list) {
      const paths: string[] = raw.split(/\n+/).map((p) => p.trim());
      while (paths.length && !paths[paths.length - 1]) paths.pop();
      for (let i = 0; i < 12; i++) {
        const file = fileOf(form, `mediaFile.${field.key}.${i}`);
        const problem = imageProblem(file);
        if (problem) fields[`media.${field.key}`] = problem;
        else if (file) {
          while (paths.length <= i) paths.push("");
          paths[i] = await store(file);
        }
      }
      if (paths.some((p) => p && !isMediaPath(p))) fields[`media.${field.key}`] = `« ${field.label} » : chemin d’image invalide.`;
      if (paths.some(Boolean)) media[field.key] = paths;
    } else {
      const file = fileOf(form, `mediaFile.${field.key}`);
      const problem = imageProblem(file);
      if (problem) fields[`media.${field.key}`] = problem;
      const value = file && !problem ? await store(file) : raw;
      if (value && !isMediaPath(value)) fields[`media.${field.key}`] = `« ${field.label} » : chemin d’image invalide.`;
      if (value) media[field.key] = value;
    }
  }
  return { content: setAtPath(content, "media", Object.keys(media).length ? media : null), fields };
}

const SCENE_TEXTS = ["label", "title", "text", "alt"] as const;
const SCENE_TEXT_MAX: Record<(typeof SCENE_TEXTS)[number], number> = { label: 60, title: 140, text: 600, alt: 200 };

/** One scene of the scenes editor: fields scene.<i>.<name> (see the vendor page). */
function sceneFromForm(form: FormData, i: number, fields: Record<string, string>): TenantScene {
  const f = (name: string, max = 300) => formText(form, `scene.${i}.${name}`, max);
  const texts = Object.fromEntries(
    SCENE_TEXTS.map((name) => {
      const values: Partial<Record<PlatformLocale, string>> = {};
      for (const locale of PLATFORM_LOCALES) values[locale] = cleanText(form.get(`scene.${i}.${name}.${locale}`), SCENE_TEXT_MAX[name]);
      return [name, toLocalized(values, SCENE_TEXT_MAX[name]) ?? { fr: "" }];
    }),
  ) as Record<(typeof SCENE_TEXTS)[number], TenantScene["label"]>;
  const faces = f("faces", 2000)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseBox(line));
  if (faces.some((b) => !b)) fields[`scene.${i}`] = `Scène ${i + 1} : une ligne de visage invalide (format x0,y0,x1,y1).`;
  const sachet = parseBox(f("sachet", 60));
  if (!sachet) fields[`scene.${i}`] = `Scène ${i + 1} : zone produit invalide (format x0,y0,x1,y1).`;
  const num = (name: string, fallback: number) => {
    const n = Number(f(name, 12).replace(",", "."));
    return f(name, 12) && Number.isFinite(n) ? n : fallback;
  };
  const aspect = num("aspect", 0);
  const pose = f("pose", 40);
  return {
    id: f("id", 40).toLowerCase(),
    image: { landscape: f("landscape"), portrait: f("portrait") || null, fallback: f("fallback") || null },
    ...(aspect > 0.2 && aspect < 5 ? { aspect } : {}),
    ...texts,
    framing: {
      ...(f("desktop", 10) === "card" ? { desktop: "card" as const } : {}),
      freeSide: f("freeSide", 10) === "left" ? "left" : "right",
      faces: faces.filter((b): b is SceneBox => b !== null),
      sachet: sachet ?? [0, 0, 1, 1],
      wide: f("wide", 40) || "50% 50%",
      copy: { width: num("copyWidth", 30) },
      anchor: { cx: num("anchorCx", 84), cy: num("anchorCy", 70), size: num("anchorSize", 28) },
    },
    pose: pose || null,
  };
}

/**
 * Scenes editor: `sceneCount` scenes (fields scene.<i>.*), uploads sceneFile.<i>.landscape / .portrait
 * (stored by `store`), then the `intent` button: save | add | remove:<i> | up:<i> | down:<i>.
 */
export async function parseScenesForm(
  form: FormData,
  slug: string,
  store: (file: File, kind: "landscape" | "portrait") => Promise<string>,
): Promise<{ scenes: TenantScene[]; fields: Record<string, string> }> {
  const fields: Record<string, string> = {};
  const count = Math.min(Math.max(Number(form.get("sceneCount")) || 0, 0), 40);
  let scenes: TenantScene[] = [];
  for (let i = 0; i < count; i++) {
    const scene = sceneFromForm(form, i, fields);
    for (const kind of ["landscape", "portrait"] as const) {
      const file = fileOf(form, `sceneFile.${i}.${kind}`);
      const problem = imageProblem(file);
      if (problem) fields[`scene.${i}`] = `Scène ${i + 1} : ${problem}`;
      else if (file) scene.image[kind] = await store(file, kind);
    }
    scenes.push(scene);
  }
  const [intent, rawIndex] = String(form.get("intent") ?? "save").split(":");
  const index = Number(rawIndex);
  const valid = Number.isInteger(index) && index >= 0 && index < scenes.length;
  if (intent === "add") scenes = [...scenes, blankScene(slug, scenes)];
  else if (intent === "remove" && valid) scenes = scenes.filter((_, i) => i !== index);
  else if ((intent === "up" || intent === "down") && valid) {
    const target = intent === "up" ? index - 1 : index + 1;
    if (target >= 0 && target < scenes.length) [scenes[index], scenes[target]] = [scenes[target], scenes[index]];
  }
  return { scenes, fields };
}

/** Localized text of a field group <prefix>.<locale>. */
export function localizedField(form: FormData, prefix: string, max: number) {
  const values: Partial<Record<PlatformLocale, string>> = {};
  for (const locale of PLATFORM_LOCALES) values[locale] = cleanText(form.get(`${prefix}.${locale}`), max);
  return toLocalized(values, max);
}
