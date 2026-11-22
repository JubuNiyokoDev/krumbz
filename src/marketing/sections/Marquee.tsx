import type { MarketingContent } from "../content";

export function Marquee({ c }: { c: MarketingContent }) {
  const items = c.marquee.items;
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((item) => (
        <li key={item} className="flex items-center whitespace-nowrap">
          <span className="px-6 font-rn-display text-[clamp(1.6rem,3.6vw,2.8rem)] font-bold tracking-[-0.03em] md:px-10">{item}</span>
          <svg width="22" height="22" viewBox="0 0 40 40" aria-hidden className="shrink-0 text-rn-nova">
            <path d="M20 2c1.4 9.6 4.9 15.6 18 18-13.1 2.4-16.6 8.4-18 18-1.4-9.6-4.9-15.6-18-18C15.1 17.6 18.6 11.6 20 2Z" fill="currentColor" />
          </svg>
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-label={c.marquee.label} className="rn-marquee relative z-10 overflow-hidden border-t border-white/8 bg-rn-ink pb-16 pt-6 md:pb-24 md:pt-8">
      <div className="rn-marquee-track flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}
