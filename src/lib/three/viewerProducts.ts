import type { KitProduct } from "@/lib/storefront/kit";

/** Maximum number of products in the 3D viewer of a shop. */
export const MAX_VIEWER_PRODUCTS = 6;

/**
 * Products the viewer of a shop without bespoke 3D can show (glTF or photo),
 * featured first. No three.js import: used by the always-loaded ProductViewer.
 */
export function viewerProducts(products: KitProduct[]): KitProduct[] {
  return [...products]
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .filter((p) => p.modelUrl || p.image)
    .slice(0, MAX_VIEWER_PRODUCTS);
}
