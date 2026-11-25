import type { MarketingContent } from "../content";

/** Royal-blue band: the kinds of shops, scrolling (paused on hover, static with reduced motion). */
export function Marquee({ c }: { c: MarketingContent }) {
  const items = [...c.marquee.items, ...c.marquee.items];
  return (
    <section aria-label={c.marquee.label} className="relative z-10 -mt-6 overflow-hidden bg-rn-blue py-5 text-white [clip-path:polygon(0_18%,100%_0,100%_82%,0_100%)] sm:py-6">
      <div className="rn-marquee" aria-hidden>
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-8 px-4 text-[clamp(1.2rem,2.4vw,2rem)] font-extrabold tracking-tight">
            {item}
            <span className="h-2.5 w-2.5 rotate-45 rounded-[3px] bg-rn-cyan" />
          </span>
        ))}
      </div>
      <p className="sr-only">{c.marquee.items.join(", ")}</p>
    </section>
  );
}
