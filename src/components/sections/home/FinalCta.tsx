import type { ReactNode } from "react";
import { StageAnchor } from "@/components/experience/StageAnchor";
import { Magnetic } from "@/components/ui/Magnetic";
import { Crumbs } from "@/components/ui/Crumbs";
import { PhoneIcon, WhatsAppIcon } from "@/components/ui/Icons";

export function FinalCta({
  title,
  text,
  button,
  phoneLabel,
  whatsappHref,
  phones,
  callLabels,
  fallback,
}: {
  title: string;
  text: string;
  button: string;
  phoneLabel: string;
  whatsappHref: string;
  phones: { display: string; e164: string }[];
  callLabels: string[];
  fallback: ReactNode;
}) {
  return (
    <section data-stage="cta" aria-labelledby="cta-title" className="grain grain-strong relative overflow-hidden bg-gold text-navy">
      <div aria-hidden className="blob blob-spin pointer-events-none absolute -bottom-[20vw] -right-[20vw] h-[70vw] w-[70vw] bg-gold-light lg:h-[44vw] lg:w-[44vw]" />
      <Crumbs
        crumbs={[
          { x: 6, y: 14, size: 18, rot: 20, tone: "dark" },
          { x: 42, y: 8, size: 12, rot: -30, tone: "rust", delay: 1 },
          { x: 30, y: 84, size: 14, rot: 50, tone: "light", delay: 2 },
          { x: 92, y: 12, size: 10, rot: 10, tone: "dark", delay: 0.5 },
        ]}
      />
      <div className="relative mx-auto grid min-h-[90svh] max-w-[88rem] items-center gap-6 px-4 py-24 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-32">
        <div className="flex flex-col items-start gap-6">
          <h2 id="cta-title" data-reveal className="font-display text-[clamp(3rem,10vw,7.5rem)] font-bold leading-[0.9] tracking-[-0.025em]">
            {title}
          </h2>
          <p data-reveal className="max-w-xl text-lg leading-relaxed sm:text-xl">
            {text}
          </p>
          <div data-reveal>
            <Magnetic>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp px-7 py-4 text-lg">
                <WhatsAppIcon size={24} />
                {button}
              </a>
            </Magnetic>
          </div>
          <div data-reveal className="mt-2">
            <p className="font-display text-base font-semibold">{phoneLabel}</p>
            <ul className="mt-3 flex flex-wrap gap-3">
              {phones.map((p, i) => (
                <li key={p.e164}>
                  <a href={`tel:${p.e164}`} aria-label={callLabels[i]} className="btn btn-ghost btn-sm bg-cream/30 text-navy">
                    <PhoneIcon size={18} />
                    {p.display}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="relative flex justify-center">
          <div aria-hidden className="absolute left-1/2 top-1/2 h-[min(78vw,30rem)] w-[min(78vw,30rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cream/40 blur-2xl" />
          <StageAnchor id="cta" fallback={fallback} className="aspect-square w-[min(78vw,32rem)]" />
        </div>
      </div>
    </section>
  );
}
