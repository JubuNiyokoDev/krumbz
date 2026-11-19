"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** True on the client after hydration, false on the server and during hydration. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
