import { PlusIcon } from "@/components/ui/Icons";
import type { MarketingContent } from "../content";
import { fill } from "../content";
import { formatAmount } from "../format";
import type { MarketingLocale, MarketingOffer } from "../types";
import { Split } from "../components/Split";

/** Questions: native exclusive accordion (<details name>), works without JS. */
export function Faq({ c, offer, locale }: { c: MarketingContent; offer: MarketingOffer; locale: MarketingLocale }) {
  const f = c.faq;
  const values = { launch: formatAmount(offer.launchPrice, locale), monthly: formatAmount(offer.monthlyPrice, locale) };
  return (
    <section id="questions" aria-labelledby="questions-title" className="relative bg-white pb-24 pt-8 md:pb-32">
      <div className="rn-container grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="rn-kicker" data-reveal>
            {f.kicker}
          </p>
          <h2 id="questions-title" data-split className="rn-title mt-5 max-w-[13ch] !text-[clamp(2rem,1.2rem+3vw,3.6rem)]">
            <Split text={f.title} />
          </h2>
        </div>
        <div className="border-t border-rn-line">
          {f.items.map((item, i) => (
            <details key={i} name="rn-faq" data-reveal className="rn-faq group border-b border-rn-line">
              <summary className="flex items-center justify-between gap-6 py-6 text-left md:py-7">
                <span className="text-[clamp(1.05rem,1.6vw,1.28rem)] font-bold leading-snug transition-colors group-hover:text-rn-blue">{fill(item.q, values)}</span>
                <span className="rn-plus grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rn-haze text-rn-blue group-open:bg-rn-blue group-open:text-white">
                  <PlusIcon size={18} />
                </span>
              </summary>
              <p className="max-w-[40rem] pb-7 pr-12 leading-relaxed text-rn-gray">{fill(item.a, values)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
