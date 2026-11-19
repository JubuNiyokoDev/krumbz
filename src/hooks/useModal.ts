"use client";

import { useEffect, useEffectEvent, type RefObject } from "react";
import { useUi } from "./useUi";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("inert") && el.getClientRects().length > 0,
  );
}

/**
 * Accessible modal behaviour for an always-mounted dialog:
 * focus moves inside and is trapped, Esc closes, the rest of the app becomes
 * inert, scrolling is locked (Lenis stopped), and focus returns to the opener.
 */
export function useModal(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  initialFocusRef?: RefObject<HTMLElement | null>,
) {
  const close = useEffectEvent(onClose);

  useEffect(() => {
    const container = containerRef.current;
    if (!open || !container) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const app = document.querySelector<HTMLElement>("[data-app-content]");
    app?.setAttribute("inert", "");
    document.documentElement.classList.add("is-locked");
    useUi.getState().lenis?.stop();

    const frame = requestAnimationFrame(() => {
      const target = initialFocusRef?.current ?? focusables(container)[0] ?? container;
      target.focus({ preventScroll: true });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables(container);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !container.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      app?.removeAttribute("inert");
      document.documentElement.classList.remove("is-locked");
      useUi.getState().lenis?.start();
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [open, containerRef, initialFocusRef]);
}
