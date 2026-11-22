"use client";

import { usePathname as useNextPathname } from "next/navigation";
import { navigation } from "./navigation";

/** Internal route tree of a storefront (src/proxy.ts): /tpl/<template>/<slug>/<locale>/<pathname>. */
const INTERNAL_STOREFRONT_PATH = /^\/tpl\/[^/]+\/[^/]+\/[^/]+(\/.*)?$/;

/**
 * next-intl's usePathname, made aware of the host-based rewrite: when a page is prerendered under its
 * internal path, next/navigation reports /tpl/<template>/<slug>/<locale>/… during the server render.
 * React keeps server-rendered attributes on hydration, so links built from that path (language
 * switcher, active navigation) would point to the internal tree. Strip it to the public pathname.
 */
export function usePathname(): ReturnType<typeof navigation.usePathname> {
  const raw = useNextPathname();
  const localized = navigation.usePathname();
  const internal = raw?.match(INTERNAL_STOREFRONT_PATH);
  return (internal ? (internal[1] ?? "/") : localized) as ReturnType<typeof navigation.usePathname>;
}
