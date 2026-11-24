"use client";

import { createContext, useContext, type ReactNode } from "react";

import { KRUMBZ_KIT, type KitProduct, type StorefrontKit } from "./kit-data";

export { KRUMBZ_KIT };
export type { KitProduct, StorefrontKit };

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
