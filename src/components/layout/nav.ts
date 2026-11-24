import type { AppPathname } from "@/i18n/routing";

/** Main navigation (labels are keys of the `nav` namespace). */
export const NAV_ITEMS: { href: AppPathname; key: "home" | "products" | "story" | "order" | "contact" }[] = [
  { href: "/", key: "home" },
  { href: "/produits", key: "products" },
  { href: "/notre-histoire", key: "story" },
  { href: "/commander", key: "order" },
  { href: "/contact", key: "contact" },
];

/** Navigation of a shop: optional pages (story) only when they exist. */
export function navItemsFor(pages: { story: boolean }) {
  return NAV_ITEMS.filter((item) => item.key !== "story" || pages.story);
}
