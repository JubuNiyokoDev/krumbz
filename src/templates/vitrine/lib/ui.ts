"use client";

import { create } from "zustand";
import type Lenis from "lenis";

interface VitrineUi {
  cartOpen: boolean;
  menuOpen: boolean;
  /** Increments on every add-to-cart (badge bump). */
  addedTick: number;
  lenis: Lenis | null;
  /**
   * A curtain transition closed the screen and the router is navigating. Kept
   * outside React so the curtain reopens even when the host route remounts the
   * whole storefront tree (e.g. a catch-all page) instead of keeping a layout.
   */
  navPending: boolean;
  setCartOpen: (open: boolean) => void;
  setMenuOpen: (open: boolean) => void;
  bump: () => void;
  setLenis: (lenis: Lenis | null) => void;
  setNavPending: (pending: boolean) => void;
}

export const useVitrineUi = create<VitrineUi>()((set) => ({
  cartOpen: false,
  menuOpen: false,
  addedTick: 0,
  lenis: null,
  navPending: false,
  setCartOpen: (cartOpen) => set({ cartOpen, menuOpen: false }),
  setMenuOpen: (menuOpen) => set({ menuOpen, cartOpen: false }),
  bump: () => set((s) => ({ addedTick: s.addedTick + 1 })),
  setLenis: (lenis) => set({ lenis }),
  setNavPending: (navPending) => set({ navPending }),
}));

/** Stops smooth scrolling while a modal layer is open. */
export function lockScroll(locked: boolean) {
  const { lenis } = useVitrineUi.getState();
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = locked ? "hidden" : "";
}
