import type { CSSProperties } from "react";
import type { ResolvedImage } from "@/lib/assets/server";
import { BrandImage } from "@/components/ui/BrandImage";
import { MushroomIcon } from "@/components/ui/Icons";
import { SectionHeading } from "../SectionHeading";

/**
 * « Du champignon au biscuit » — right after the 3D intro: the mushroom
 * (ikizinu) is the base ingredient, shown with a photo and three steps.
 */
export function FromMushroom({
  eyebrow,
  title,
  text,
  steps,
  image,
  alt,
  placeholderLabel,
}: {
  eyebrow: string;
  title: string;
  text: string;
  steps: { title: string; text: string }[];
  image: ResolvedImage;
  alt: string;
  placeholderLabel: string;
}) {
  return (
    <section aria-labelledby="from-mushroom-title" className="grain relative overflow-hidden bg-cream-deep py-20 sm:py-24 lg:py-32">
      <div className="relative mx-auto grid max-w-[88rem] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:px-10">
        <div>
          <SectionHeading id="from-mushroom-title" eyebrow={eyebrow} title={title} lead={text} />
          <ol className="mt-10 space-y-4">
            {steps.map((step, i) => (
              <li
                key={step.title}
                data-reveal
                style={{ "--reveal-delay": `${i * 110}ms` } as CSSProperties}
                className="flex items-start gap-4 rounded-[1.75rem] bg-cream p-4 shadow-biscuit ring-1 ring-navy/5 sm:p-5"
              >
                <span
                  aria-hidden
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-full font-display text-xl font-bold ${i === 0 ? "bg-navy text-gold-light" : "bg-gold text-navy"}`}
                >
                  {i === 0 ? <MushroomIcon size={24} /> : i + 1}
                </span>
                <span>
                  <span className="block font-display text-xl font-bold leading-tight">{step.title}</span>
                  <span className="mt-1 block text-navy/80">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div data-reveal="scale" className="relative">
          <div aria-hidden className="blob absolute -inset-[6%] bg-gold-light/50 blur-2xl" />
          <div className="relative aspect-[3/2] overflow-hidden rounded-[2.5rem] bg-cream shadow-lift ring-1 ring-navy/10">
            <BrandImage image={image} alt={alt} sizes="(min-width: 1024px) 50vw, 92vw" placeholderLabel={placeholderLabel} />
          </div>
        </div>
      </div>
    </section>
  );
}
