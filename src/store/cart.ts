"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface CartLine {
  id: string;
  quantity: number;
}

export const MAX_QUANTITY = 999;

interface CartState {
  lines: CartLine[];
  hydrated: boolean;
  add: (id: string, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const clamp = (n: number) => Math.max(0, Math.min(MAX_QUANTITY, Math.floor(Number.isFinite(n) ? n : 0)));

/**
 * Persistent cart (localStorage, key "krumbz-cart").
 * Hydration is manual (`useCart.persist.rehydrate()` in <CartHydrator/>) so the
 * server HTML and the first client render always match.
 */
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      hydrated: false,
      add: (id, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.id === id);
          if (existing) {
            return {
              lines: state.lines.map((l) => (l.id === id ? { ...l, quantity: clamp(l.quantity + quantity) } : l)),
            };
          }
          return { lines: [...state.lines, { id, quantity: clamp(quantity) }] };
        }),
      setQuantity: (id, quantity) =>
        set((state) => {
          const q = clamp(quantity);
          if (q === 0) return { lines: state.lines.filter((l) => l.id !== id) };
          if (!state.lines.some((l) => l.id === id)) return { lines: [...state.lines, { id, quantity: q }] };
          return { lines: state.lines.map((l) => (l.id === id ? { ...l, quantity: q } : l)) };
        }),
      remove: (id) => set((state) => ({ lines: state.lines.filter((l) => l.id !== id) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: "krumbz-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ lines: state.lines }),
      onRehydrateStorage: () => () => {
        useCart.setState({ hydrated: true });
      },
    },
  ),
);

export function useCartCount(): number {
  return useCart((s) => s.lines.reduce((sum, l) => sum + l.quantity, 0));
}
