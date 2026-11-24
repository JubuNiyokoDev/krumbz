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
  mark = true,
}: {
  eyebrow: string;
  text: string;
  /** null: text-only reminder (shops without this photo). */
  image: ResolvedImage | null;
  alt: string;
  placeholderLabel: string;
  reversed?: boolean;
  /** Krumbz: mushroom icon in the eyebrow. */
  mark?: boolean;
}) {
  const portrait = image ? image.height > image.width : false;
  return (
    <aside aria-label={eyebrow} data-mushroom-break className="relative overflow-hidden bg-navy px-4 py-16 text-cream sm:px-6 lg:px-10 lg:py-24">
      <div aria-hidden className="blob pointer-events-none absolute -right-[16vw] top-1/2 h-[50vw] w-[50vw] -translate-y-1/2 bg-gold/10 lg:h-[30vw] lg:w-[30vw]" />
      <div className={`relative mx-auto grid max-w-[88rem] items-center gap-8 lg:gap-16 ${image ? "lg:grid-cols-2" : "max-w-4xl justify-items-center text-center"}`}>
        {image ? (
        <div data-reveal="scale" className={`${reversed ? "lg:order-2" : ""} ${portrait ? "mx-auto w-full max-w-sm lg:max-w-md" : ""}`}>
          <div className="overflow-hidden rounded-[2rem] shadow-lift ring-1 ring-cream/10">
            <BrandImage image={image} alt={alt} fill={false} sizes={portrait ? "(min-width: 1024px) 28rem, 92vw" : "(min-width: 1024px) 44vw, 92vw"} placeholderLabel={placeholderLabel} />
          </div>
        </div>
        ) : null}
        <div data-reveal className={`flex flex-col gap-5 ${image ? "items-start" : "items-center"}`}>
          <p className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-1.5 font-display text-sm font-bold uppercase tracking-[0.12em] text-navy">
            {mark ? <MushroomIcon size={18} /> : null}
            {eyebrow}
          </p>
          <p className="font-display text-[clamp(1.9rem,4.6vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.015em]">{text}</p>
        </div>
      </div>
    </aside>
  );
}
