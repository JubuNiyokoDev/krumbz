"use client";

import { create } from "zustand";
import type Lenis from "lenis";

/**
 * Interface state shared by the shell, the header and the dialogs.
 * `lenis` is the smooth-scroll instance (null when reduced motion is on).
 * `navigate` plays the page transition then navigates (set by SiteShell).
 */
interface UiState {
  cartOpen: boolean;
  menuOpen: boolean;
  lenis: Lenis | null;
  navigate: ((href: string) => void) | null;
  setCartOpen: (open: boolean) => void;
  setMenuOpen: (open: boolean) => void;
  setLenis: (lenis: Lenis | null) => void;
  setNavigate: (navigate: ((href: string) => void) | null) => void;
}

export const useUi = create<UiState>()((set) => ({
  cartOpen: false,
  menuOpen: false,
  lenis: null,
  navigate: null,
  setCartOpen: (cartOpen) => set(cartOpen ? { cartOpen, menuOpen: false } : { cartOpen }),
  setMenuOpen: (menuOpen) => set(menuOpen ? { menuOpen, cartOpen: false } : { menuOpen }),
  setLenis: (lenis) => set({ lenis }),
  setNavigate: (navigate) => set({ navigate }),
}));

/** Smoothly scrolls to an element or position, with or without Lenis. */
export function scrollToTarget(target: HTMLElement | number, offset = 0) {
  const { lenis } = useUi.getState();
  if (lenis) {
    lenis.scrollTo(target, { offset });
    return;
  }
  const top = typeof target === "number" ? target : target.getBoundingClientRect().top + window.scrollY + offset;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
}
