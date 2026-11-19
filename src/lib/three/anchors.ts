"use client";

import { isStageId, STAGE_ANCHOR_ATTR, STAGE_ATTR, STAGE_IDS, type StageId } from "@/lib/experience/stages";

/**
 * DOM side of the scroll ↔ 3D contract (see src/lib/experience/stages.ts).
 * No three.js import: used by the always-loaded ExperienceLayer.
 */
export interface AnchorEntry {
  id: StageId;
  element: HTMLElement;
  /** The enclosing `[data-stage]` section, if any (scroll range of the stage). */
  section: HTMLElement | null;
}

/** Anchors in STAGE_IDS order (document order breaks ties). Hidden anchors are kept; size is checked per frame. */
export function scanAnchors(root: ParentNode = document): AnchorEntry[] {
  const entries: AnchorEntry[] = [];
  root.querySelectorAll<HTMLElement>(`[${STAGE_ANCHOR_ATTR}]`).forEach((element) => {
    const id = element.getAttribute(STAGE_ANCHOR_ATTR) ?? "";
    if (!isStageId(id)) return;
    entries.push({ id, element, section: element.closest<HTMLElement>(`[${STAGE_ATTR}]`) });
  });
  const order = (id: StageId) => STAGE_IDS.indexOf(id);
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => order(a.entry.id) - order(b.entry.id) || a.index - b.index)
    .map(({ entry }) => entry);
}

/** Event dispatched by the UI after each page transition. */
export const PAGE_CHANGE_EVENT = "krumbz:pagechange";

// --- anchor presence store (useSyncExternalStore) ----------------------------

let signature = "";
let version = 0;
const listeners = new Set<() => void>();
let teardown: (() => void) | null = null;

function computeSignature() {
  return scanAnchors()
    .map((a) => a.id)
    .join("|");
}

function refresh() {
  const next = computeSignature();
  if (next !== signature) {
    signature = next;
    version++;
    listeners.forEach((listener) => listener());
  }
}

/** Forces listeners to re-scan even when the ids did not change (new DOM nodes after navigation). */
function bump() {
  signature = computeSignature();
  version++;
  listeners.forEach((listener) => listener());
}

function start() {
  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      refresh();
    });
  };
  const onPageChange = () => requestAnimationFrame(bump);
  // safety net: route changes without the custom event, lazy sections…
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" || mutation.addedNodes.length || mutation.removedNodes.length) {
        schedule();
        return;
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: [STAGE_ANCHOR_ATTR] });
  window.addEventListener(PAGE_CHANGE_EVENT, onPageChange);
  window.addEventListener("popstate", schedule);
  refresh();
  return () => {
    observer.disconnect();
    window.removeEventListener(PAGE_CHANGE_EVENT, onPageChange);
    window.removeEventListener("popstate", schedule);
    if (frame) cancelAnimationFrame(frame);
  };
}

export function subscribeAnchors(listener: () => void) {
  listeners.add(listener);
  teardown ??= start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      teardown?.();
      teardown = null;
    }
  };
}

/** Changes whenever the set of anchors (or the page) changes; 0 = no anchor. */
export function getAnchorVersion() {
  return signature ? version : 0;
}

export const getServerAnchorVersion = () => 0;
