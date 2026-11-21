import type { ResolvedImage } from "@/lib/assets/server";
import { BrandImage } from "@/components/ui/BrandImage";
import { MushroomIcon } from "@/components/ui/Icons";

/**
 * Visual reminder of the mushroom (ikizinu) between two life moments.
 * Not a 3D stage: the travelling products simply pass over it.
 * The photo keeps its own proportions (nothing important is cropped).
 */
export function MushroomBreak({
  eyebrow,
  text,
  image,
  alt,
  placeholderLabel,
  reversed = false,
}: {
  eyebrow: string;
  text: string;
  image: ResolvedImage;
  alt: string;
  placeholderLabel: string;
  reversed?: boolean;
}) {
  const portrait = image.height > image.width;
  return (
    <aside aria-label={eyebrow} data-mushroom-break className="relative overflow-hidden bg-navy px-4 py-16 text-cream sm:px-6 lg:px-10 lg:py-24">
      <div aria-hidden className="blob pointer-events-none absolute -right-[16vw] top-1/2 h-[50vw] w-[50vw] -translate-y-1/2 bg-gold/10 lg:h-[30vw] lg:w-[30vw]" />
      <div className="relative mx-auto grid max-w-[88rem] items-center gap-8 lg:grid-cols-2 lg:gap-16">
        <div data-reveal="scale" className={`${reversed ? "lg:order-2" : ""} ${portrait ? "mx-auto w-full max-w-sm lg:max-w-md" : ""}`}>
          <div className="overflow-hidden rounded-[2rem] shadow-lift ring-1 ring-cream/10">
            <BrandImage image={image} alt={alt} fill={false} sizes={portrait ? "(min-width: 1024px) 28rem, 92vw" : "(min-width: 1024px) 44vw, 92vw"} placeholderLabel={placeholderLabel} />
          </div>
        </div>
        <div data-reveal className="flex flex-col items-start gap-5">
          <p className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-1.5 font-display text-sm font-bold uppercase tracking-[0.12em] text-navy">
            <MushroomIcon size={18} />
            {eyebrow}
          </p>
          <p className="font-display text-[clamp(1.9rem,4.6vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.015em]">{text}</p>
        </div>
      </div>
    </aside>
  );
}
