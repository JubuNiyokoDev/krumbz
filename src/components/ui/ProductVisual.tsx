import { PackIllustration } from "@/components/ui/PackIllustration";
import { BrandMark } from "@/components/ui/BrandMark";

/**
 * Visual of a product in cards, cart and order flow.
 * Krumbz (model sachet / carton): the drawn pack. Other shops (model "product"): the product's
 * cut-out photo in the same box, else the shop's mark.
 */
export function ProductVisual({
  model,
  brand,
  tagline,
  image,
  className = "",
}: {
  model: string;
  brand: string;
  tagline: string;
  image?: { url: string; alt?: string } | null;
  className?: string;
}) {
  if (model !== "product") return <PackIllustration model={model} brand={brand} tagline={tagline} className={className} />;
  if (image?.url) {
    // eslint-disable-next-line @next/next/no-img-element -- product photos of any format (uploads, SVG), already sized
    return <img src={image.url} alt="" aria-hidden loading="lazy" decoding="async" className={`object-contain ${className}`} />;
  }
  return <BrandMark className={className} />;
}
