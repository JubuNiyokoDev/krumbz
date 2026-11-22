import { ArrowRightIcon, CheckIcon } from "@/components/ui/Icons";
import { Magnetic } from "@/components/ui/Magnetic";
import type { MarketingContent } from "../content";
import { formatAmount } from "../format";
import type { MarketingLocale, MarketingOffer } from "../types";
import { Split } from "../components/Split";
import { NovaMark } from "../components/Logo";

export function Offer({ c, offer, locale }: { c: MarketingContent; offer: MarketingOffer; locale: MarketingLocale }) {
  const o = c.offer;

  return (
    <section id="offre" aria-labelledby="offre-title" className="rn-sheet z-50 bg-rn-paper text-rn-ink">
      <div className="mx-auto max-w-[1320px] px-5 pb-24 pt-24 sm:px-8 md:pb-32 md:pt-32">
        <div className="mx-auto max-w-[48rem] text-center">
          <p className="rn-kicker text-rn-nova-deep" data-reveal>
            {o.kicker}
          </p>
          <h2 id="offre-title" data-split className="mt-5 text-[clamp(2.2rem,5.6vw,4.6rem)] font-bold leading-[0.98]">
            <Split text={o.title} />
          </h2>
          <p data-reveal className="mx-auto mt-6 max-w-[34rem] text-[1.08rem] leading-relaxed text-rn-stone">
            {o.lead}
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-[64rem] gap-6 md:mt-20 md:grid-cols-2">
          {/* Launch pack */}
          <article data-reveal className="relative flex flex-col rounded-[2rem] bg-white p-8 shadow-[0_40px_80px_-50px_rgb(13_12_18/0.45),inset_0_0_0_1px_rgb(13_12_18/0.06)] md:p-10">
            <h3 className="text-[1.05rem] font-bold uppercase tracking-[0.12em] text-rn-stone">{o.pack.label}</h3>
            <Price amount={formatAmount(offer.launchPrice, locale)} currency={o.currency} />
            <p className="mt-2 text-rn-stone">{o.pack.note}</p>
            <Includes items={o.pack.includes} tone="light" />
          </article>

          {/* Monthly subscription */}
          <article data-reveal className="relative flex flex-col overflow-hidden rounded-[2rem] bg-rn-ink p-8 text-rn-cream shadow-[0_40px_80px_-40px_rgb(13_12_18/0.7)] md:p-10">
            <div aria-hidden className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-rn-nova/35 blur-3xl" />
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[1.05rem] font-bold uppercase tracking-[0.12em] text-rn-muted">{o.monthly.label}</h3>
              <span className="rounded-full bg-rn-nova px-3.5 py-1.5 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-rn-ink">{o.monthly.badge}</span>
            </div>
            <Price amount={formatAmount(offer.monthlyPrice, locale)} currency={o.currency} per={o.monthly.per} />
            <p className="relative mt-2 text-rn-muted">{o.monthly.note}</p>
            <Includes items={o.monthly.includes} tone="dark" />
          </article>
        </div>

        {/* Pause, explained gently */}
        <div data-reveal className="mx-auto mt-6 grid max-w-[64rem] items-center gap-8 rounded-[2rem] bg-rn-paper-2 p-8 md:grid-cols-[1.2fr_1fr] md:p-10">
          <div>
            <h3 className="text-[clamp(1.5rem,2.6vw,2rem)] font-bold leading-tight">{o.pause.title}</h3>
            <p className="mt-4 max-w-[32rem] leading-relaxed text-rn-stone">{o.pause.text}</p>
          </div>
          <PausePreview c={c} />
        </div>

        <div data-reveal className="mt-14 flex justify-center">
          <Magnetic>
            <a href="#vitrine" className="rn-btn rn-btn-ink">
              {o.cta}
              <ArrowRightIcon size={20} />
            </a>
          </Magnetic>
        </div>
      </div>
    </section>
  );
}

function Price({ amount, currency, per }: { amount: string; currency: string; per?: string }) {
  return (
    <p className="relative mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="font-rn-display text-[clamp(3rem,6.5vw,4.6rem)] font-bold leading-none tracking-[-0.04em]">{amount}</span>
      <span className="text-xl font-bold">{currency}</span>
      {per ? <span className="text-lg font-semibold opacity-70">{per}</span> : null}
    </p>
  );
}

function Includes({ items, tone }: { items: string[]; tone: "light" | "dark" }) {
  return (
    <ul className={`relative mt-8 space-y-3.5 border-t pt-8 ${tone === "dark" ? "border-white/12" : "border-rn-ink/10"}`}>
      {items.map((item) => (
        <li key={item} className="flex gap-3 leading-snug">
          <span
            className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${tone === "dark" ? "bg-rn-nova text-rn-ink" : "bg-rn-ink text-rn-cream"}`}
          >
            <CheckIcon size={14} strokeWidth={3} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Miniature of the "shop on pause" page: calm, elegant, never alarming. */
function PausePreview({ c }: { c: MarketingContent }) {
  const p = c.offer.pause;
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[22rem]">
      <div className="overflow-hidden rounded-[1.5rem] bg-rn-ink p-1.5 shadow-[0_30px_60px_-30px_rgb(13_12_18/0.6)]">
        <div className="flex gap-1.5 px-3 pb-2 pt-1.5">
          <i className="h-2 w-2 rounded-full bg-white/20" />
          <i className="h-2 w-2 rounded-full bg-white/20" />
          <i className="h-2 w-2 rounded-full bg-white/20" />
        </div>
        <div className="relative grid aspect-[16/10] place-items-center overflow-hidden rounded-[1.1rem] bg-gradient-to-br from-[#2a2633] via-rn-ink-2 to-[#3a2420] text-center">
          <div className="absolute inset-0 opacity-40 [background:radial-gradient(60%_60%_at_50%_40%,rgb(255_91_46/0.35),transparent_70%)]" />
          <div className="relative px-6">
            <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center gap-1.5 rounded-full bg-white/10">
              <i className="block h-3.5 w-1 rounded-full bg-rn-cream" />
              <i className="block h-3.5 w-1 rounded-full bg-rn-cream" />
            </span>
            <p className="text-[0.62rem] uppercase tracking-[0.2em] text-rn-muted">{p.previewName}</p>
            <p className="mt-1 font-rn-display text-xl font-bold text-rn-cream">{p.previewTitle}</p>
            <p className="mt-1 text-[0.72rem] text-rn-muted">{p.previewText}</p>
          </div>
          <NovaMark size={18} className="absolute bottom-3 right-3 text-rn-cream opacity-60" />
        </div>
      </div>
    </div>
  );
}
