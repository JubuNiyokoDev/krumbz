"use client";

import { create, type StoreApi, type UseBoundStore } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Product data the client needs (resolved for the current locale on the server). */
export interface CatalogItem {
  id: string;
  slug: string;
  name: string;
  price: number | null;
  compareAtPrice: number | null;
  image: { url: string; alt: string } | null;
  href: string;
}

export interface VitrineCartLine {
  id: string; // product id
  option: string | null; // e.g. colour variant chosen in the 3D viewer
  quantity: number;
}

interface CartState {
  lines: VitrineCartLine[];
  hydrated: boolean;
  add: (id: string, quantity?: number, option?: string | null) => void;
  setQuantity: (id: string, option: string | null, quantity: number) => void;
  remove: (id: string, option: string | null) => void;
  clear: () => void;
}

export const MAX_QUANTITY = 99;
const clamp = (n: number) => Math.max(0, Math.min(MAX_QUANTITY, Math.floor(Number.isFinite(n) ? n : 0)));
const same = (l: VitrineCartLine, id: string, option: string | null) => l.id === id && l.option === option;

type CartStore = UseBoundStore<StoreApi<CartState>> & {
  persist: { rehydrate: () => Promise<void> | void; getOptions: () => { name?: string } };
};

const stores = new Map<string, CartStore>();

/**
 * One persistent cart per shop (localStorage key `rundinova-cart:<slug>`), so
 * two vendors visited on the same device never mix their baskets. Hydration is
 * manual (Shell) so the server HTML and the first client render match.
 */
export function getCartStore(tenantSlug: string): CartStore {
  let store = stores.get(tenantSlug);
  if (store) return store;
  store = create<CartState>()(
    persist(
      (set) => ({
        lines: [],
        hydrated: false,
        add: (id, quantity = 1, option = null) =>
          set((state) => {
            const existing = state.lines.find((l) => same(l, id, option));
            if (existing) return { lines: state.lines.map((l) => (l === existing ? { ...l, quantity: clamp(l.quantity + quantity) } : l)) };
            return { lines: [...state.lines, { id, option, quantity: clamp(quantity) }] };
          }),
        setQuantity: (id, option, quantity) =>
          set((state) => {
            const q = clamp(quantity);
            if (q === 0) return { lines: state.lines.filter((l) => !same(l, id, option)) };
            return { lines: state.lines.map((l) => (same(l, id, option) ? { ...l, quantity: q } : l)) };
          }),
        remove: (id, option) => set((state) => ({ lines: state.lines.filter((l) => !same(l, id, option)) })),
        clear: () => set({ lines: [] }),
      }),
      {
        name: `rundinova-cart:${tenantSlug}`,
        version: 1,
        storage: createJSONStorage(() => localStorage),
        skipHydration: true,
        partialize: (state) => ({ lines: state.lines }),
        onRehydrateStorage: () => () => {
          stores.get(tenantSlug)?.setState({ hydrated: true });
        },
      },
    ),
  ) as CartStore;
  stores.set(tenantSlug, store);
  return store;
}
