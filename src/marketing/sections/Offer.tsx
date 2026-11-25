import Image from "next/image";
import { ArrowRightIcon, CheckIcon } from "@/components/ui/Icons";
import mark from "../../../public/brand/rundinova-mark.png";
import type { MarketingContent } from "../content";
import { formatAmount } from "../format";
import type { MarketingLocale, MarketingOffer } from "../types";
import { Split } from "../components/Split";

function Price({ amount, currency, per, light = false }: { amount: string; currency: string; per?: string; light?: boolean }) {
  return (
    <p className="mt-6 flex flex-wrap items-baseline gap-x-2">
      <span className={`text-[clamp(3rem,2rem+4vw,4.6rem)] font-extrabold leading-none tracking-tighter ${light ? "text-white" : "text-black"}`}>{amount}</span>
      <span className={`text-xl font-bold ${light ? "text-rn-cyan" : "text-rn-blue"}`}>{currency}</span>
      {per ? <span className={`text-lg font-semibold ${light ? "text-rn-ice" : "text-rn-gray"}`}>{per}</span> : null}
    </p>
  );
}

function Includes({ items, light = false }: { items: string[]; light?: boolean }) {
  return (
    <ul className="mt-8 space-y-3.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${light ? "bg-rn-cyan text-black" : "bg-rn-haze text-rn-blue"}`}>
            <CheckIcon size={14} />
          </span>
          <span className={light ? "text-white" : "text-black"}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** The offer: launch pack + monthly subscription (prices from the super-admin settings), and the pause promise. */
export function Offer({ c, offer, locale }: { c: MarketingContent; offer: MarketingOffer; locale: MarketingLocale }) {
  const o = c.offer;
  return (
    <section id="offre" aria-labelledby="offre-title" className="relative bg-white py-24 md:py-32">
      <div className="rn-container">
        <div className="mx-auto max-w-[48rem] text-center">
          <p className="rn-kicker" data-reveal>
            {o.kicker}
          </p>
          <h2 id="offre-title" data-split className="rn-title mt-5">
            <Split text={o.title} />
          </h2>
          <p data-reveal className="mx-auto mt-6 max-w-[34rem] text-[1.06rem] leading-relaxed text-rn-gray">
            {o.lead}
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-[66rem] gap-6 md:mt-20 md:grid-cols-2">
          <article data-reveal className="rn-card flex flex-col p-8 md:p-10">
            <h3 className="text-[0.95rem] font-bold uppercase tracking-[0.14em] text-rn-gray">{o.pack.label}</h3>
            <Price amount={formatAmount(offer.launchPrice, locale)} currency={o.currency} />
            <p className="mt-2 font-medium text-rn-gray">{o.pack.note}</p>
            <Includes items={o.pack.includes} />
          </article>

          <article data-reveal className="rn-deep-bg relative flex flex-col overflow-hidden rounded-[1.75rem] p-8 text-white shadow-[0_50px_90px_-45px_rgb(0_8_184/0.85)] md:p-10">
            <Image src={mark} alt="" aria-hidden sizes="320px" className="pointer-events-none absolute -bottom-10 -right-16 w-80 opacity-[0.12] mix-blend-screen" />
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[0.95rem] font-bold uppercase tracking-[0.14em] text-rn-ice">{o.monthly.label}</h3>
              <span className="rounded-full bg-rn-cyan px-3.5 py-1.5 text-xs font-bold text-black">{o.monthly.badge}</span>
            </div>
            <div className="relative">
              <Price amount={formatAmount(offer.monthlyPrice, locale)} currency={o.currency} per={o.monthly.per} light />
              <p className="mt-2 font-medium text-rn-ice">{o.monthly.note}</p>
              <Includes items={o.monthly.includes} light />
            </div>
            <a href="#vitrine" className="rn-btn rn-btn-white relative mt-10 self-start">
              {o.cta}
              <ArrowRightIcon size={18} />
            </a>
          </article>
        </div>

        <div data-reveal className="mx-auto mt-6 grid max-w-[66rem] items-center gap-8 rounded-[1.75rem] bg-rn-mist p-8 md:grid-cols-[1.4fr_1fr] md:p-10">
          <div>
            <h3 className="text-[1.35rem] font-bold">{o.pause.title}</h3>
            <p className="mt-3 leading-relaxed text-rn-gray">{o.pause.text}</p>
          </div>
          <div aria-hidden className="rounded-2xl bg-white p-6 text-center shadow-[0_24px_50px_-30px_rgb(0_8_184/0.45)]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-rn-gray">{o.pause.previewName}</p>
            <p className="mt-3 text-2xl font-extrabold text-rn-blue">{o.pause.previewTitle}</p>
            <p className="mt-1 text-sm text-rn-gray">{o.pause.previewText}</p>
            <span className="mx-auto mt-4 block h-1.5 w-24 overflow-hidden rounded-full bg-rn-haze">
              <span className="block h-full w-1/2 animate-[rn-scrolldot_2.4s_ease-in-out_infinite] rounded-full bg-rn-cyan motion-reduce:animate-none" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
