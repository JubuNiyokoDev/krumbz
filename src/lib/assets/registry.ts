/**
 * Registry of every brand image the site expects in /public.
 * This list is the single reference used by the components, the README
 * generator (scripts/images-readme.mjs) and the placeholders.
 * A file dropped with the exact name is picked up automatically.
 */
export type Orientation = "paysage" | "portrait" | "carré" | "libre";

export interface ImageSlot {
  /** Path relative to /public, starting with a slash. */
  path: string;
  format: "jpg" | "png";
  orientation: Orientation;
  /** Recommended size in pixels. */
  size: string;
  usage: string;
}

export const SCENE_IDS = [
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
export type SceneId = (typeof SCENE_IDS)[number];

const sceneUsage: Record<SceneId, string> = {
  "couple-jardin": "Accueil, scène « À deux » : un couple au jardin",
  "famille-maison": "Accueil, scène « En famille » : une famille à la maison",
  "classe-enseignant": "Accueil, scène « En classe » : un enseignant et ses élèves",
  anniversaire: "Accueil, scène « Anniversaire »",
  mariage: "Accueil, scène « Mariage »",
  "pause-bureau": "Accueil, scène « Au bureau » : pause entre collègues",
  "amis-sortie": "Accueil, scène « Entre amis » : sortie entre amis",
  "petit-dejeuner": "Accueil, scène « Petit-déjeuner » : en famille le matin",
  bibliotheque: "Accueil, scène « À la bibliothèque » : pause révisions entre étudiants",
  "equipe-sport": "Accueil, scène « Entre coéquipiers » : une équipe de foot après l’entraînement",
  "reunion-bureau": "Accueil, scène « En réunion » : une équipe autour de la table",
  marche: "Accueil, scène « Au marché » : une cliente avec son panier de Krumbz",
  "champs-agriculteurs": "Accueil, scène « Aux champs » : des agriculteurs en pause",
  "panier-cadeau": "Accueil, scène « Un panier offert » : un cadeau de Krumbz entre proches",
  "road-trip": "Accueil, scène « En voyage » : une famille en voiture",
  "echange-boutique": "Accueil, scène « Chez le commerçant » : vente de Krumbz en boutique",
  "famille-noel": "Accueil, scène « Joyeux Noël » : une famille fête Noël avec Krumbz",
};

export function scenePath(id: SceneId, orientation: "paysage" | "portrait") {
  return `/images/scenes/${id}-${orientation}.jpg`;
}

export const IMAGE_SLOTS: ImageSlot[] = [
  ...SCENE_IDS.flatMap((id) => [
    {
      path: scenePath(id, "paysage"),
      format: "jpg" as const,
      orientation: "paysage" as const,
      size: "2400 × 1350 (16:9), < 400 Ko",
      usage: `${sceneUsage[id]} — ordinateur et tablette en paysage. Laisser de l’espace libre au centre-droit pour le produit 3D.`,
    },
    {
      path: scenePath(id, "portrait"),
      format: "jpg" as const,
      orientation: "portrait" as const,
      size: "1080 × 1920 (9:16), < 300 Ko",
      usage: `${sceneUsage[id]} — téléphone, FACULTATIF : sans ce fichier, la version paysage est recadrée automatiquement (visages et sachet visibles). S’il est fourni, il s’affiche en plein écran : laisser de l’espace libre dans le tiers inférieur pour le produit 3D.`,
    },
  ]),
  {
    path: "/images/product/biscuit-top.png",
    format: "png",
    orientation: "carré",
    size: "1024 × 1024, fond transparent",
    usage: "Vue de dessus d’un biscuit, bien centrée. Sert de texture de couleur au biscuit 3D et d’image de repli.",
  },
  {
    path: "/images/product/biscuit-studio.png",
    format: "png",
    orientation: "carré",
    size: "1600 × 1600, fond transparent",
    usage: "Photo studio des produits (sachet, carton, biscuits). Image de repli quand la 3D est désactivée.",
  },
  {
    path: "/images/story/burundi-collines.jpg",
    format: "jpg",
    orientation: "paysage",
    size: "2400 × 1600 (3:2), < 450 Ko",
    usage: "Page « Notre histoire » : chapitre « Fabriqué au Burundi ».",
  },
  {
    path: "/images/story/champignons.jpg",
    format: "jpg",
    orientation: "paysage",
    size: "2400 × 1600 (3:2), < 450 Ko",
    usage: "Page « Notre histoire » : chapitre « L’origine champignon ».",
  },
  {
    path: "/images/og/og-image.jpg",
    format: "jpg",
    orientation: "paysage",
    size: "1200 × 630, < 300 Ko",
    usage: "Image de partage (Open Graph, WhatsApp, Facebook, X).",
  },
  {
    path: "/textures/sachet-front.png",
    format: "png",
    orientation: "portrait",
    size: "1024 × 1536 (2:3), étiquette à plat, sans transparence",
    usage: "Étiquette avant du sachet 3D (pillow pack). La zone utile doit couvrir toute l’image.",
  },
  {
    path: "/textures/sachet-back.png",
    format: "png",
    orientation: "portrait",
    size: "1024 × 1536 (2:3), étiquette à plat, sans transparence",
    usage: "Étiquette arrière du sachet 3D.",
  },
  {
    path: "/textures/carton-label.png",
    format: "png",
    orientation: "paysage",
    size: "2048 × 1024 (2:1), patron déplié",
    usage:
      "Étiquette du carton 3D. Patron horizontal : moitié gauche = face avant, moitié droite = face arrière ; le dessus et les côtés reprennent la couleur dominante.",
  },
];

export const TEXTURE_KEYS = {
  sachetFront: "/textures/sachet-front.png",
  sachetBack: "/textures/sachet-back.png",
  cartonLabel: "/textures/carton-label.png",
  biscuitTop: "/images/product/biscuit-top.png",
} as const;
export type TextureKey = keyof typeof TEXTURE_KEYS;
/** URL of each 3D texture, or null while the file is missing. */
export type TextureMap = Record<TextureKey, string | null>;
