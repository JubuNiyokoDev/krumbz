/** Shop kit data shared by server and client (the React context lives in kit.tsx). */
/** A product as the 3D journey / viewer / cards of a shop without bespoke models see it. */
export interface KitProduct {
  id: string;
  name: string;
  /** Cut-out photo (transparent PNG preferred), or null. */
  image: string | null;
  /** Optimised glTF (Meshopt), or null. */
  modelUrl: string | null;
  featured: boolean;
}

/**
 * What differs between shops on the client side (the rest is CSS variables + next-intl messages).
 * `bespoke` = Krumbz: procedural sachet/carton/biscuit, biscuit mark, pack illustrations.
 */
export interface StorefrontKit {
  bespoke: boolean;
  slug: string;
  name: string;
  logoUrl: string | null;
  /** Static-mode / scene cut-out (Krumbz: the MARIE biscuit). */
  cutout: string | null;
  /** Visible products, featured first. */
  products: KitProduct[];
}

export const KRUMBZ_KIT: StorefrontKit = { bespoke: true, slug: "krumbz", name: "Krumbz", logoUrl: null, cutout: null, products: [] };
