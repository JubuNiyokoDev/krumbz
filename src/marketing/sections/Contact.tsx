import Image from "next/image";
import { ArrowRightIcon } from "@/components/ui/Icons";
import mark from "../../../public/brand/rundinova-mark.png";
import type { MarketingContent } from "../content";
import { Split } from "../components/Split";
import { LeadForm } from "../components/LeadForm";

/**
 * « Je veux ma vitrine » (#vitrine): the WhatsApp lead form on the royal-blue panel, and the
 * « RundiNova Tech Payment » block (Amtips link + QR, payee Joffre Niyondiko; values from the super-admin settings).
 */
export function Contact({
  c,
  whatsappNumber,
  paymentLink,
  paymentQrPath,
}: {
  c: MarketingContent;
  whatsappNumber: string;
  paymentLink?: string;
  paymentQrPath?: string;
}) {
  const f = c.form;
  const pay = c.payment;
  return (
    <section id="vitrine" aria-labelledby="vitrine-title" className="relative bg-white px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="rn-dark rn-deep-bg relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem]">
        <Image src={mark} alt="" aria-hidden sizes="50vw" className="pointer-events-none absolute -bottom-24 -left-24 w-[38rem] max-w-none opacity-[0.1] mix-blend-screen" />
        <div className="rn-container relative grid gap-12 pb-20 pt-20 md:pb-28 md:pt-28 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="rn-kicker" data-reveal>
              {f.kicker}
            </p>
            <h2 id="vitrine-title" data-split className="rn-title mt-5 max-w-[13ch]">
              <Split text={f.title} />
            </h2>
            <p data-reveal className="mt-6 max-w-[30rem] text-[1.06rem] leading-relaxed text-rn-ice">
              {f.lead}
            </p>

            {paymentLink ? (
              <div data-reveal className="mt-10 max-w-[30rem] rounded-[1.5rem] bg-white p-5 text-black shadow-[0_40px_80px_-40px_rgb(0_0_0/0.7)] sm:p-6" aria-labelledby="paiement-title">
                <div className="flex items-center gap-3">
                  <Image src={mark} alt="" aria-hidden sizes="48px" className="h-7 w-auto" />
                  <div>
                    <p id="paiement-title" className="text-[1.05rem] font-extrabold leading-tight tracking-tight">
                      {pay.label}
                    </p>
                    <p className="text-xs font-semibold text-rn-gray">
                      {pay.holderLabel} : <span className="text-rn-blue">{pay.holder}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
                  {paymentQrPath ? (
                    // eslint-disable-next-line @next/next/no-img-element -- QR path comes from the super-admin settings
                    <img src={paymentQrPath} alt={pay.qrAlt} width={132} height={132} loading="lazy" className="h-[8.25rem] w-[8.25rem] shrink-0 rounded-xl ring-1 ring-rn-line" />
                  ) : null}
                  <div>
                    <p className="text-sm font-bold text-rn-blue">{pay.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-rn-gray">{pay.lead}</p>
                    <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="rn-btn rn-btn-primary mt-4 !min-h-[2.8rem] !px-5 text-sm">
                      {pay.cta}
                      <ArrowRightIcon size={16} className="-rotate-45" />
                    </a>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div data-reveal className="rounded-[1.75rem] bg-white/[0.07] p-6 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.16)] backdrop-blur-sm sm:p-9">
            <LeadForm text={f} whatsappNumber={whatsappNumber} />
          </div>
        </div>
      </div>
    </section>
  );
}
