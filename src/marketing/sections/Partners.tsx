import type { MarketingContent } from "../content";
import type { MarketingShop } from "../types";
import { Split } from "../components/Split";
import { PartnerCarousel } from "../components/PartnerCarousel";

/**
 * « Nos boutiques partenaires »: the registered active / trial shops (src/lib/platform/gallery.ts, read by the
 * server page), Krumbz first, in the 3D carousel; a « your shop here » card closes the ring.
 */
export function Partners({ c, shops }: { c: MarketingContent; shops: MarketingShop[] }) {
  const s = c.shops;
  return (
    <section id="boutiques" aria-labelledby="boutiques-title" className="rn-dark rn-night-bg relative overflow-hidden py-24 md:py-32">
      <div aria-hidden className="rn-grid-bg pointer-events-none absolute inset-0 opacity-60" />
      <div className="rn-container relative">
        <div className="mx-auto max-w-[46rem] text-center">
          <p className="rn-kicker" data-reveal>
            {s.kicker}
          </p>
          <h2 id="boutiques-title" data-split className="rn-title mt-5">
            <Split text={s.title} />
          </h2>
          <p data-reveal className="mx-auto mt-6 max-w-[34rem] text-[1.06rem] leading-relaxed text-rn-ice/85">
            {s.lead}
          </p>
        </div>
        <div className="mt-14 md:mt-16" data-reveal>
          <PartnerCarousel
            shops={shops}
            text={{
              carousel: s.carousel,
              prev: s.prev,
              next: s.next,
              slide: s.slide,
              hint: s.hint,
              visit: s.visit,
              imageAlt: s.imageAlt,
              palette: s.palette,
              yours: s.yours,
            }}
          />
        </div>
      </div>
    </section>
  );
}
