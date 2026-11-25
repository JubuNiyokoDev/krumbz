import type { MarketingContent } from "../content";
import { Split } from "../components/Split";

const ICONS = [
  // Conversation
  <path key="a" d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6l-4 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />,
  // Storefront
  <path key="b" d="M4 10l1.5-5h13L20 10M4 10v9h16v-9M4 10c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3M10 19v-4h4v4" />,
  // Phone + message
  <path key="c" d="M8 3h8a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 16 21H8a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 8 3zM11 18h2M9.5 8.5h5M9.5 11.5h3" />,
];

/** Three steps on a progress line that fills while scrolling. */
export function HowItWorks({ c }: { c: MarketingContent }) {
  const h = c.how;
  return (
    <section id="comment" aria-labelledby="comment-title" className="relative bg-white py-24 md:py-32">
      <div className="rn-container">
        <div className="max-w-[46rem]">
          <p className="rn-kicker" data-reveal>
            {h.kicker}
          </p>
          <h2 id="comment-title" data-split className="rn-title mt-5">
            <Split text={h.title} />
          </h2>
        </div>
        <div className="relative mt-16 md:mt-20">
          <div aria-hidden className="absolute left-0 right-0 top-[2.1rem] hidden h-[3px] rounded bg-rn-haze md:block">
            <div data-line className="h-full origin-left rounded bg-gradient-to-r from-rn-blue to-rn-cyan" />
          </div>
          <ol className="grid gap-6 md:grid-cols-3">
            {h.steps.map((step, i) => (
              <li key={step.title} data-reveal className="rn-card relative p-7 md:p-8">
                <div className="flex items-center justify-between">
                  <span className="relative grid h-[4.2rem] w-[4.2rem] place-items-center rounded-2xl bg-gradient-to-br from-rn-blue to-rn-mid text-white shadow-[0_18px_30px_-14px_rgb(0_8_184/0.7)]">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      {ICONS[i % ICONS.length]}
                    </svg>
                  </span>
                  <span aria-hidden className="text-[3.4rem] font-extrabold leading-none tracking-tighter text-rn-haze">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-7 text-[1.32rem] font-bold leading-snug">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-rn-gray">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
