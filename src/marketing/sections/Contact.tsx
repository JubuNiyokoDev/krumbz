import type { MarketingContent } from "../content";
import { Split } from "../components/Split";
import { LeadForm } from "../components/LeadForm";
import type { MarketingLocale } from "../types";

/** « Je veux ma vitrine » — anchor #vitrine. */
export function Contact({
  c,
  locale,
  whatsappNumber,
  paymentLink,
  paymentQrPath,
}: {
  c: MarketingContent;
  locale: MarketingLocale;
  whatsappNumber: string;
  paymentLink?: string;
  paymentQrPath?: string;
}) {
  const f = c.form;
  const pay = {
    fr: { title: "Paiement Amtips", lead: "Scannez le QR code ou ouvrez le lien pour voir tous les moyens de paiement disponibles, puis envoyez la preuve.", cta: "Ouvrir le lien de paiement" },
    rn: { title: "Kwishura na Amtips", lead: "Scana QR canke ufungure umurongo kugira ubone uburyo bwose bwo kwishura, hanyuma wohereze icemezo.", cta: "Gufungura umurongo" },
    en: { title: "Pay with Amtips", lead: "Scan the QR code or open the link to see all available payment methods, then send proof.", cta: "Open payment link" },
    sw: { title: "Lipa kwa Amtips", lead: "Changanua QR au fungua kiungo kuona njia zote za malipo, kisha tuma uthibitisho.", cta: "Fungua kiungo cha malipo" },
  }[locale];
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
          {paymentLink ? (
            <div data-reveal className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-rn-cream">{pay.title}</p>
              <p className="mt-1 text-sm text-rn-muted">{pay.lead}</p>
              <div className="mt-3 flex items-center gap-4">
                {paymentQrPath ? <img src={paymentQrPath} alt={pay.title} className="h-24 w-24 rounded-lg bg-white p-1" /> : null}
                <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="rn-btn rn-btn-ghost text-rn-cream">
                  {pay.cta}
                </a>
              </div>
            </div>
          ) : null}
        </div>
        <div data-reveal className="rounded-[2rem] bg-white/[0.035] p-6 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.09)] backdrop-blur-sm sm:p-9">
          <LeadForm text={f} whatsappNumber={whatsappNumber} />
        </div>
      </div>
    </section>
  );
}
