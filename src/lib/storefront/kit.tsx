"use client";

import { createContext, useContext, type ReactNode } from "react";

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

const KitContext = createContext<StorefrontKit>(KRUMBZ_KIT);

export function KitProvider({ kit, children }: { kit: StorefrontKit; children: ReactNode }) {
  return <KitContext.Provider value={kit}>{children}</KitContext.Provider>;
}

export function useKit(): StorefrontKit {
  return useContext(KitContext);
}

/**
 * Roles of the products in the journey (same poses as Krumbz):
 * main = the sachet's role (model or photo), second = the carton's role, others = the biscuits' roles.
 */
export function journeyCast(products: KitProduct[], biscuitCount: number) {
  const ordered = [...products].sort((a, b) => Number(b.featured) - Number(a.featured));
  const main = ordered.find((p) => p.modelUrl) ?? ordered.find((p) => p.image) ?? null;
  const rest = ordered.filter((p) => p !== main && p.image);
  const second = rest[0] ?? main;
  const pool = rest.length > 1 ? rest.slice(1) : rest.length ? rest : main ? [main] : [];
  const biscuits = pool.length ? Array.from({ length: biscuitCount }, (_, i) => pool[i % pool.length]) : [];
  return { main, second, biscuits };
}
