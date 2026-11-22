import { WhatsAppIcon } from "@/components/ui/Icons";
import type { MarketingContent } from "../content";
import { Split } from "../components/Split";

const STEP_ICONS = [
  // 1. Chat + photos
  <svg key="chat" viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M8 10h24a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H18l-8 6v-6H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4Z" />
    <rect x="24" y="22" width="20" height="16" rx="3" fill="#0d0c12" />
    <circle cx="34" cy="30" r="4" />
    <path d="M29 22l2-3h6l2 3" />
  </svg>,
  // 2. Storefront in 3D
  <svg key="build" viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M24 4 42 14v20L24 44 6 34V14L24 4Z" />
    <path d="M6 14l18 10 18-10M24 24v20" />
    <path d="M38 4l1.2 2.8L42 8l-2.8 1.2L38 12l-1.2-2.8L34 8l2.8-1.2L38 4Z" fill="currentColor" />
  </svg>,
];

export function HowItWorks({ c }: { c: MarketingContent }) {
  const h = c.how;
  return (
    <section id="comment" aria-labelledby="comment-title" className="rn-sheet z-20 bg-rn-paper text-rn-ink">
      <div className="mx-auto max-w-[1320px] px-5 pb-28 pt-24 sm:px-8 md:pb-36 md:pt-32">
        <p className="rn-kicker text-rn-nova-deep" data-reveal>
          {h.kicker}
        </p>
        <h2 id="comment-title" data-split className="mt-5 max-w-[16ch] text-[clamp(2.2rem,5.6vw,4.6rem)] font-bold leading-[0.98]">
          <Split text={h.title} />
        </h2>

        <div className="relative mt-16 md:mt-24">
          {/* progress line (desktop) */}
          <div aria-hidden className="absolute left-0 right-0 top-[2.6rem] hidden h-px bg-rn-ink/12 md:block">
            <div data-line className="h-full origin-left bg-rn-nova-deep" />
          </div>
          <ol className="grid gap-12 md:grid-cols-3 md:gap-10">
            {h.steps.map((step, i) => (
              <li key={step.title} data-reveal className="relative">
                <div className="flex items-center gap-5">
                  <span className="rn-step-num text-[5.2rem] font-bold leading-none text-rn-ink">{String(i + 1).padStart(2, "0")}</span>
                  <span className="relative z-10 grid h-16 w-16 place-items-center rounded-2xl bg-rn-ink text-rn-cream shadow-[0_20px_40px_-20px_rgb(13_12_18/0.6)]">
                    {i < 2 ? STEP_ICONS[i] : <WhatsAppIcon size={30} className="text-rn-wa" />}
                  </span>
                </div>
                <h3 className="mt-7 text-[1.55rem] font-bold leading-tight">{step.title}</h3>
                <p className="mt-3 max-w-[30rem] text-[1.02rem] leading-relaxed text-rn-stone">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
