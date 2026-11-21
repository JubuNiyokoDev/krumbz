import type { CSSProperties } from "react";
import { Link } from "@/i18n/navigation";
import type { ResolvedImage } from "@/lib/assets/server";
import { BrandImage } from "@/components/ui/BrandImage";
import { SectionHeading } from "../SectionHeading";

interface Nutrient {
  symbol: string;
  title: string;
  text: string;
}

/**
 * « Le champignon, cœur de Krumbz » — presents mushroom as a food (Burundian
 * tradition + well-established nutrients). The disclaimer makes clear these
 * facts describe mushrooms, not the biscuit's own composition.
 */
export function MushroomSection({
  eyebrow,
  title,
  intro,
  whyTitle,
  items,
  disclaimer,
  cta,
  images,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  whyTitle: string;
  items: Nutrient[];
  disclaimer: string;
  cta: string;
  images?: { harvest: ResolvedImage; closeup: ResolvedImage; harvestAlt: string; closeupAlt: string; placeholderLabel: string };
}) {
  return (
    <section aria-labelledby="mushroom-title" className="relative overflow-hidden bg-navy py-24 text-cream sm:py-28 lg:py-36">
      <div aria-hidden className="blob pointer-events-none absolute -right-[18vw] -top-[12vw] h-[55vw] w-[55vw] bg-navy-soft/70 lg:h-[34vw] lg:w-[34vw]" />
      <div aria-hidden className="blob-2 pointer-events-none absolute -bottom-[16vw] -left-[14vw] h-[48vw] w-[48vw] bg-gold/10 lg:h-[28vw] lg:w-[28vw]" />

      <div className="relative mx-auto max-w-[88rem] px-4 sm:px-6 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <SectionHeading id="mushroom-title" eyebrow={eyebrow} title={title} tone="light" />
            <p data-reveal className="mt-6 max-w-xl text-lg leading-relaxed text-cream/85 sm:text-xl">
              {intro}
            </p>
            <Link
              href="/produits"
              data-reveal
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 font-display font-semibold text-navy shadow-biscuit transition-transform duration-300 ease-out-back hover:-translate-y-0.5"
            >
              {cta}
              <span aria-hidden>→</span>
            </Link>
            {images ? (
              <div className="mt-10 grid grid-cols-[0.85fr_1.15fr] items-end gap-4">
                <div data-reveal="scale" className="relative aspect-[2/3] overflow-hidden rounded-[1.75rem] shadow-lift ring-1 ring-cream/15">
                  <BrandImage image={images.harvest} alt={images.harvestAlt} sizes="(min-width: 1024px) 18vw, 40vw" placeholderLabel={images.placeholderLabel} />
                </div>
                <div data-reveal="scale" style={{ "--reveal-delay": "120ms" } as CSSProperties} className="relative mb-8 aspect-[4/3] overflow-hidden rounded-[1.75rem] shadow-lift ring-1 ring-cream/15">
                  <BrandImage image={images.closeup} alt={images.closeupAlt} sizes="(min-width: 1024px) 24vw, 52vw" placeholderLabel={images.placeholderLabel} />
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <h3 data-reveal className="font-display text-2xl font-bold text-gold-light sm:text-3xl">
              {whyTitle}
            </h3>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {items.map((item, i) => (
                <li
                  key={item.title}
                  data-reveal
                  style={{ "--reveal-delay": `${i * 80}ms` } as CSSProperties}
                  className="group rounded-[1.75rem] bg-cream/[0.06] p-5 ring-1 ring-cream/15 transition-[transform,background-color] duration-500 ease-out-back hover:-translate-y-1 hover:bg-cream/[0.1] sm:p-6"
                >
                  <span
                    aria-hidden
                    className="inline-grid h-12 min-w-12 place-items-center rounded-2xl bg-gold px-3 font-display text-sm font-bold text-navy shadow-biscuit transition-transform duration-500 ease-out-back group-hover:-rotate-6"
                  >
                    {item.symbol}
                  </span>
                  <h4 className="mt-4 font-display text-xl font-bold leading-tight">{item.title}</h4>
                  <p className="mt-2 text-cream/80">{item.text}</p>
                </li>
              ))}
            </ul>
            <p data-reveal className="mt-6 text-sm leading-relaxed text-cream/65">
              {disclaimer}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
