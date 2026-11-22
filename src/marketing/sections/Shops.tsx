import { ArrowRightIcon } from "@/components/ui/Icons";
import { TiltCard } from "@/components/ui/TiltCard";
import type { MarketingContent } from "../content";
import { fill } from "../content";
import { displayHost } from "../format";
import type { MarketingShop } from "../types";
import { Split } from "../components/Split";
import { ShopImage } from "../components/ShopImage";
import { NovaMark } from "../components/Logo";

export function Shops({ c, shops }: { c: MarketingContent; shops: MarketingShop[] }) {
  const s = c.shops;
  const [featured, ...others] = shops;

  return (
    <section id="boutiques" aria-labelledby="boutiques-title" className="rn-sheet z-30 bg-rn-ink text-rn-cream">
      <div className="mx-auto max-w-[1320px] px-5 pb-28 pt-24 sm:px-8 md:pb-36 md:pt-32">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="rn-kicker text-rn-nova" data-reveal>
              {s.kicker}
            </p>
            <h2 id="boutiques-title" data-split className="mt-5 max-w-[14ch] text-[clamp(2.2rem,5.6vw,4.6rem)] font-bold leading-[0.98]">
              <Split text={s.title} />
            </h2>
          </div>
          <p data-reveal className="max-w-[26rem] text-[1.05rem] leading-relaxed text-rn-muted">
            {s.lead}
          </p>
        </div>

        <ul className="mt-14 grid gap-6 md:mt-20 md:grid-cols-12 md:gap-8">
          {featured ? (
            // With exactly one other shop, the featured card spans two rows: [featured | other / yours].
            <li data-reveal className={`md:col-span-8 ${others.length === 1 ? "md:row-span-2" : ""}`}>
              <ShopCard shop={featured} c={c} badge={s.first} large tall={others.length === 1} />
            </li>
          ) : null}
          {others.map((shop) => (
            <li key={shop.url} data-reveal className="md:col-span-4">
              <ShopCard shop={shop} c={c} />
            </li>
          ))}
          <li data-reveal className="md:col-span-4">
            <a
              href="#vitrine"
              className="group relative flex h-full min-h-[20rem] flex-col justify-between overflow-hidden rounded-[2rem] border border-dashed border-white/20 p-7 transition-colors duration-500 hover:border-rn-nova md:p-8"
            >
              <NovaMark size={56} className="text-rn-cream transition-transform duration-700 group-hover:rotate-90" />
              <div>
                <p className="font-rn-display text-[1.9rem] font-bold leading-tight">{s.yours.title}</p>
                <p className="mt-3 text-rn-muted">{s.yours.text}</p>
                <span className="mt-6 inline-flex items-center gap-2 font-semibold text-rn-nova">
                  {s.yours.cta}
                  <ArrowRightIcon size={18} className="transition-transform duration-500 group-hover:translate-x-1" />
                </span>
              </div>
            </a>
          </li>
        </ul>
      </div>
    </section>
  );
}

function ShopCard({
  shop,
  c,
  badge,
  large = false,
  tall = false,
}: {
  shop: MarketingShop;
  c: MarketingContent;
  badge?: string;
  large?: boolean;
  /** Spans two grid rows: the picture grows to fill the height. */
  tall?: boolean;
}) {
  return (
    <TiltCard max={4} className="h-full rounded-[2rem]">
      <a
        href={shop.url}
        target="_blank"
        rel="noopener"
        className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] bg-rn-ink-2 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]"
      >
        <div
          className={`relative overflow-hidden ${large ? "aspect-[16/10]" : "aspect-[4/3]"} ${tall ? "md:aspect-auto md:min-h-[22rem] md:flex-1" : ""}`}
        >
          <div data-parallax-img className="absolute inset-[-8%_0]">
            <ShopImage
              src={shop.imageUrl}
              alt={fill(c.shops.imageAlt, { name: shop.name })}
              fallbackLabel={shop.name}
              sizes={large ? "(min-width: 768px) 66vw, 100vw" : "(min-width: 768px) 33vw, 100vw"}
              className="object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
            />
          </div>
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-rn-ink-2 via-transparent to-transparent" />
          {badge ? (
            <span className="absolute left-5 top-5 rounded-full bg-rn-nova px-3.5 py-1.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-rn-ink">
              {badge}
            </span>
          ) : null}
        </div>
        <div
          className={`flex flex-col justify-between gap-6 p-7 md:p-8 ${large ? "md:flex-row md:items-end" : ""} ${tall ? "" : "flex-1"}`}
        >
          <div>
            <p className="text-[0.78rem] font-semibold tracking-wide text-rn-muted">{displayHost(shop.url)}</p>
            <h3 className="mt-1.5 text-[clamp(1.8rem,3.4vw,2.6rem)] font-bold leading-none">{shop.name}</h3>
            <p className="mt-3 max-w-[30rem] text-rn-muted">{shop.tagline}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-rn-cream px-5 py-3 text-sm font-semibold text-rn-ink transition-colors duration-300 group-hover:bg-rn-nova md:self-auto">
            {c.shops.visit}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M7 17 17 7M8 7h9v9" />
            </svg>
          </span>
        </div>
      </a>
    </TiltCard>
  );
}
