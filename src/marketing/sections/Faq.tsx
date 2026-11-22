import { PlusIcon } from "@/components/ui/Icons";
import type { MarketingContent } from "../content";
import { fill } from "../content";
import { formatAmount } from "../format";
import type { MarketingLocale, MarketingOffer } from "../types";
import { Split } from "../components/Split";

export function Faq({ c, offer, locale }: { c: MarketingContent; offer: MarketingOffer; locale: MarketingLocale }) {
  const f = c.faq;
  const values = { launch: formatAmount(offer.launchPrice, locale), monthly: formatAmount(offer.monthlyPrice, locale) };

  return (
    <section id="questions" aria-labelledby="questions-title" className="relative z-50 bg-rn-paper text-rn-ink">
      <div className="mx-auto grid max-w-[1320px] gap-12 px-5 pb-36 pt-8 sm:px-8 md:pb-44 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="rn-kicker text-rn-nova-deep" data-reveal>
            {f.kicker}
          </p>
          <h2 id="questions-title" data-split className="mt-5 max-w-[12ch] text-[clamp(2.2rem,5vw,4rem)] font-bold leading-[0.98]">
            <Split text={f.title} />
          </h2>
        </div>
        <div className="rn-faq border-t border-rn-ink/12">
          {f.items.map((item, i) => (
            <details key={i} name="rn-faq" data-reveal className="group border-b border-rn-ink/12">
              <summary className="flex items-center justify-between gap-6 py-6 text-left md:py-7">
                <span className="font-rn-display text-[clamp(1.1rem,1.9vw,1.4rem)] font-bold leading-snug">{fill(item.q, values)}</span>
                <span className="rn-faq-icon grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rn-ink/6">
                  <PlusIcon size={18} />
                </span>
              </summary>
              <p className="max-w-[40rem] pb-7 pr-12 leading-relaxed text-rn-stone">{fill(item.a, values)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
