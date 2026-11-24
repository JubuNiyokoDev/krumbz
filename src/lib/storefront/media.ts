/**
 * Images of the template sections and life-moment scenes for one shop (server only).
 * Krumbz: its built-in files (src/lib/assets/registry.ts, unchanged paths and framing).
 * Other shops: tenant.content.media + tenant.scenes (public paths or /uploads/…).
 */
import "server-only";
import type { SiteContent } from "@/lib/content";
import { scenePath, type SceneId } from "@/lib/assets/registry";
import { SCENE_FRAMING, type SceneFraming } from "@/lib/assets/scene-framing";
import { isBespoke, mediaExists } from "@/templates/boutique/content";
import type { StorefrontData, TenantMedia } from "@/lib/tenant/types";
import { KRUMBZ_KIT, type StorefrontKit } from "./kit-data";

export interface StorefrontMedia {
  studio: string | null;
  cutout: string | null;
  og: string | null;
  highlight: string | null;
  breaks: (string | null)[];
  harvest: string | null;
  closeup: string | null;
  story: (string | null)[];
  journey: (string | null)[];
  ingredients: string | null;
}

const KRUMBZ_MEDIA: StorefrontMedia = {
  studio: "/images/product/biscuit-studio.png",
  cutout: "/images/product/biscuit-top.png",
  og: "/images/og/og-image.jpg",
  highlight: "/images/champignons/champignons-et-krumbz.jpg",
  breaks: ["/images/champignons/champignon-biscuit-transition.jpg", "/images/champignons/panier-champignons.jpg"],
  harvest: "/images/champignons/recolte-foret.jpg",
  closeup: "/images/champignons/champignons-gros-plan.jpg",
  story: [], // Krumbz: story.chapters[i].image names a file of /images/story/
  journey: ["recolte-foret", "marche-champignons", "panier-champignons"].map((n) => `/images/champignons/${n}.jpg`),
  ingredients: "/images/champignons/champignons-gros-plan.jpg",
};

/** First path that exists (provisional visuals: the next candidates). */
export function firstExisting(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) if (mediaExists(c)) return c;
  return null;
}

export function storefrontMedia(data: StorefrontData): StorefrontMedia {
  if (isBespoke(data.tenant)) return KRUMBZ_MEDIA;
  const m = ((data.tenant.content as Record<string, unknown>).media ?? {}) as TenantMedia;
  const featured = data.products.filter((p) => p.featured);
  const productPhoto = firstExisting(...[...featured, ...data.products].flatMap((p) => p.images.map((i) => i.url)));
  const studio = firstExisting(m.studio) ?? productPhoto;
  return {
    studio,
    cutout: firstExisting(m.cutout) ?? studio,
    og: firstExisting(m.og),
    highlight: firstExisting(m.highlight),
    breaks: (m.breaks ?? []).map((p) => firstExisting(p)),
    harvest: firstExisting(m.harvest),
    closeup: firstExisting(m.closeup),
    story: (m.story ?? []).map((p) => firstExisting(p)),
    journey: (m.journey ?? []).map((p) => firstExisting(p)),
    ingredients: firstExisting(m.ingredients),
  };
}

export interface StorefrontScene {
  id: string;
  label: string;
  title: string;
  text: string;
  alt: string;
  /** Landscape / portrait photos (may not exist yet: the slide shows `fallback` or a placeholder). */
  landscape: string;
  portrait: string | null;
  fallback: string | null;
  aspect: number | undefined;
  framing: SceneFraming;
  /** Composition of the 3D journey (poses.ts). */
  pose: string;
}

/** Varied compositions for shops: cycled through by position when a scene has no explicit pose. */
export const POSE_CYCLE = [
  "couple-jardin",
  "anniversaire",
  "famille-maison",
  "amis-sortie",
  "mariage",
  "pause-bureau",
  "classe-enseignant",
  "petit-dejeuner",
  "equipe-sport",
  "panier-cadeau",
  "famille-noel",
  "road-trip",
] as const;

export function storefrontScenes(data: StorefrontData, content: SiteContent): StorefrontScene[] {
  if (isBespoke(data.tenant) && !data.tenant.scenes.length) {
    return content.home.moments.scenes.map((s) => ({
      ...s,
      landscape: scenePath(s.id as SceneId, "paysage"),
      portrait: scenePath(s.id as SceneId, "portrait"),
      fallback: null,
      aspect: undefined,
      framing: SCENE_FRAMING[s.id as SceneId],
      pose: s.id,
    }));
  }
  const texts = new Map(content.home.moments.scenes.map((s) => [s.id, s]));
  return data.tenant.scenes.map((scene, i) => {
    const t = texts.get(scene.id);
    return {
      id: scene.id,
      label: t?.label ?? "",
      title: t?.title ?? "",
      text: t?.text ?? "",
      alt: t?.alt ?? "",
      landscape: scene.image.landscape,
      portrait: scene.image.portrait,
      fallback: scene.image.fallback,
      aspect: scene.aspect ?? 16 / 9,
      framing: scene.framing,
      pose: scene.pose || POSE_CYCLE[i % POSE_CYCLE.length],
    };
  });
}

/** Client kit of a shop (src/lib/storefront/kit.tsx). */
export function storefrontKit(data: StorefrontData, content: SiteContent, media: StorefrontMedia): StorefrontKit {
  const bespoke = isBespoke(data.tenant);
  if (bespoke) return { ...KRUMBZ_KIT, slug: data.tenant.slug, name: data.tenant.name };
  type Extra = { image?: { url: string } | null; modelUrl?: string | null; featured?: boolean };
  const products = (content.products.items as (SiteContent["products"]["items"][number] & Extra)[])
    .map((item) => ({ id: item.id, name: item.name, image: item.image?.url ?? null, modelUrl: item.modelUrl ?? null, featured: !!item.featured }))
    .sort((a, b) => Number(b.featured) - Number(a.featured));
  return {
    bespoke: false,
    slug: data.tenant.slug,
    name: data.tenant.name,
    logoUrl: firstExisting(data.tenant.theme.logoUrl),
    cutout: media.cutout,
    products,
  };
}
