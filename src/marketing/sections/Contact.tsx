import type { MarketingContent } from "../content";
import { Split } from "../components/Split";
import { LeadForm } from "../components/LeadForm";

/** « Je veux ma vitrine » — anchor #vitrine. */
export function Contact({ c, whatsappNumber }: { c: MarketingContent; whatsappNumber: string }) {
  const f = c.form;
  return (
    <section id="vitrine" aria-labelledby="vitrine-title" className="rn-sheet z-[60] overflow-hidden bg-rn-ink text-rn-cream">
      <div aria-hidden className="absolute -left-40 top-20 h-[30rem] w-[30rem] rounded-full bg-rn-violet/20 blur-[120px]" />
      <div aria-hidden className="absolute -right-32 bottom-0 h-[26rem] w-[26rem] rounded-full bg-rn-nova/20 blur-[120px]" />
      <div className="relative mx-auto grid max-w-[1320px] gap-12 px-5 pb-28 pt-24 sm:px-8 md:pb-36 md:pt-32 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <p className="rn-kicker text-rn-nova" data-reveal>
            {f.kicker}
          </p>
          <h2 id="vitrine-title" data-split className="mt-5 max-w-[13ch] text-[clamp(2.2rem,5.6vw,4.6rem)] font-bold leading-[0.98]">
            <Split text={f.title} />
          </h2>
          <p data-reveal className="mt-6 max-w-[30rem] text-[1.08rem] leading-relaxed text-rn-muted">
            {f.lead}
          </p>
        </div>
        <div data-reveal className="rounded-[2rem] bg-white/[0.035] p-6 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.09)] backdrop-blur-sm sm:p-9">
          <LeadForm text={f} whatsappNumber={whatsappNumber} />
        </div>
      </div>
    </section>
  );
}
