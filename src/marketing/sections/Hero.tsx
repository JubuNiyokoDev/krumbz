import { ArrowRightIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { Magnetic } from "@/components/ui/Magnetic";
import type { MarketingContent } from "../content";
import { fill } from "../content";
import { displayHost } from "../format";
import type { MarketingShop } from "../types";
import { Split, wordCount } from "../components/Split";
import { QrMock } from "../components/QrMock";
import { ShopImage } from "../components/ShopImage";
import { HeroBackdrop } from "../components/HeroBackdrop";

export function Hero({ c, shop }: { c: MarketingContent; shop: MarketingShop | undefined }) {
  const h = c.hero;
  const titleWords = wordCount(h.title);

  return (
    <section id="accueil" data-hero className="relative isolate min-h-[100svh] overflow-hidden">
      <div aria-hidden className="rn-hero-bg absolute inset-0 -z-10">
        <HeroBackdrop />
        <div className="rn-grain" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-rn-ink" />
      </div>

      <div className="mx-auto grid max-w-[1320px] items-center gap-10 px-5 pb-24 pt-28 sm:px-8 md:pt-32 lg:min-h-[100svh] lg:grid-cols-[1.08fr_0.92fr] lg:gap-6 lg:pb-16 lg:pt-28">
        <div className="relative z-10 min-w-0 @container">
          <p className="rn-kicker rn-fade-up text-rn-nova" style={{ "--d": "0ms" } as React.CSSProperties}>
            {h.kicker}
          </p>
          {/* Sized on its column: the longest word (« professionnelle, » ≈ 8.2em in Syne 700) always fits. */}
          <h1 className="rn-hero-title mt-6 text-[clamp(2rem,11.6cqi,5.6rem)] font-bold leading-[0.98]">
            <span className="rn-hero-line">
              <Split text={h.title} />
            </span>{" "}
            <span className="rn-hero-line rn-accent-text">
              <Split text={h.titleAccent} offset={titleWords} />
            </span>
          </h1>
          <p
            className="rn-fade-up mt-7 max-w-[36rem] text-[1.06rem] leading-relaxed text-rn-muted sm:text-lg"
            style={{ "--d": "450ms" } as React.CSSProperties}
          >
            {h.lead}
          </p>
          <div className="rn-fade-up mt-9 flex flex-wrap items-center gap-3 sm:gap-4" style={{ "--d": "600ms" } as React.CSSProperties}>
            <Magnetic>
              <a href="#vitrine" className="rn-btn rn-btn-nova">
                {h.ctaPrimary}
                <ArrowRightIcon size={20} />
              </a>
            </Magnetic>
            {shop ? (
              <a href={shop.url} target="_blank" rel="noopener" className="rn-btn rn-btn-ghost text-rn-cream">
                {fill(h.ctaSecondary, { name: shop.name })}
              </a>
            ) : null}
          </div>
        </div>

        {shop ? <DeviceStage c={c} shop={shop} /> : null}
      </div>

      <a
        href="#comment"
        className="absolute bottom-6 right-8 hidden flex-col items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-rn-muted lg:flex"
      >
        {h.scroll}
        <span aria-hidden className="relative block h-12 w-px overflow-hidden bg-white/15">
          <span className="rn-scroll-cue absolute inset-0 bg-rn-nova" />
        </span>
      </a>
    </section>
  );
}

function DeviceStage({ c, shop }: { c: MarketingContent; shop: MarketingShop }) {
  const d = c.hero.device;
  const host = displayHost(shop.url);

  return (
    <div
      role="img"
      aria-label={fill(d.imageAlt, { name: shop.name })}
      className="rn-stage relative mx-auto aspect-[4/5] w-full max-w-[25rem] sm:max-w-[30rem] lg:max-w-[min(34rem,calc((100svh-9rem)*0.8))]"
    >
      {/* Orbit rings */}
      <svg aria-hidden viewBox="0 0 400 400" className="absolute inset-[-12%] h-[124%] w-[124%] opacity-60">
        <defs>
          <linearGradient id="rn-orbit" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff5b2e" stopOpacity="0.9" />
            <stop offset="1" stopColor="#7c62ff" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <ellipse cx="200" cy="200" rx="188" ry="120" fill="none" stroke="url(#rn-orbit)" strokeWidth="1" transform="rotate(-24 200 200)" />
        <ellipse cx="200" cy="200" rx="160" ry="182" fill="none" stroke="white" strokeOpacity="0.07" strokeWidth="1" />
      </svg>

      <div data-stage-scroll className="absolute inset-0 grid place-items-center">
        {/* Phone */}
        <div data-depth="0.6" className="relative w-[58%]">
          <div className="rn-device-in">
            <div className="rn-device" aria-hidden>
              <div className="rn-screen relative aspect-[9/19]">
                <div className="flex items-center justify-between px-4 pt-2.5 text-[0.55rem] font-semibold">
                  <span>9:41</span>
                  <span className="rn-notch" />
                  <span className="flex gap-0.5">
                    <i className="block h-1.5 w-1.5 rounded-full bg-current" />
                    <i className="block h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                    <i className="block h-1.5 w-1.5 rounded-full bg-current opacity-30" />
                  </span>
                </div>
                <div className="mx-3 mt-2.5 flex items-center justify-center gap-1.5 rounded-full bg-[#12264a]/8 px-3 py-1.5 text-[0.55rem] font-semibold text-[#12264a]/80">
                  <svg width="8" height="9" viewBox="0 0 8 9" aria-hidden>
                    <path d="M1.5 4V2.8a2.5 2.5 0 0 1 5 0V4M1 4h6v4.5H1z" fill="none" stroke="currentColor" strokeWidth="1.1" />
                  </svg>
                  {host}
                </div>
                <div className="relative mx-3 mt-3 aspect-[4/3.4] overflow-hidden rounded-[1.1rem]">
                  <ShopImage
                    src={shop.imageUrl}
                    alt=""
                    fallbackLabel={shop.name}
                    preload
                    sizes="(min-width: 1024px) 300px, 55vw"
                    className="object-cover object-[72%_50%] scale-[1.35]"
                  />
                </div>
                <div className="px-4 pt-3">
                  <p className="font-rn-display text-[1.05rem] font-bold leading-tight">{shop.name}</p>
                  <p className="mt-1 line-clamp-2 text-[0.62rem] leading-snug opacity-70">{shop.tagline}</p>
                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="block aspect-square rounded-lg bg-gradient-to-br from-[#f3c76b] to-[#d2691e] opacity-[0.85]" style={{ opacity: 0.9 - i * 0.2 }} />
                    ))}
                  </div>
                </div>
                <div className="absolute inset-x-3 bottom-4 flex items-center justify-center gap-1.5 rounded-full bg-rn-wa py-2.5 text-[0.62rem] font-bold text-rn-ink">
                  <WhatsAppIcon size={12} />
                  {d.order}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp message */}
        <div data-depth="1.6" className="absolute right-[-2%] top-[16%] w-[52%] max-w-[15rem] sm:right-[-6%]">
          <div className="rn-float rn-bob p-3 sm:p-3.5" style={{ "--d": "-1.5s" } as React.CSSProperties}>
            <div className="flex items-center gap-2">
              <span className="rn-ping grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rn-wa text-rn-ink">
                <WhatsAppIcon size={15} />
              </span>
              <span className="text-[0.7rem] font-semibold text-rn-cream">{d.chatTitle}</span>
            </div>
            <p className="mt-2 rounded-xl rounded-tl-sm bg-white/8 px-3 py-2 text-[0.72rem] leading-snug text-rn-cream/90">
              {d.chatMessage}
            </p>
          </div>
        </div>

        {/* Shirt with the shop's QR code */}
        <div data-depth="1.2" className="absolute bottom-[9%] left-[-3%] w-[40%] max-w-[11rem] sm:left-[-7%]">
          <div className="rn-float rn-bob bottom-0 left-0 p-3" style={{ "--d": "-4s" } as React.CSSProperties}>
            <div className="relative mx-auto w-[86%]">
              <svg viewBox="0 0 120 110" aria-hidden className="w-full drop-shadow-[0_10px_18px_rgb(0_0_0/0.35)]">
                <path
                  d="M38 6c4 8 12 12 22 12S78 14 82 6l30 14-10 26-12-5v62H30V41l-12 5L8 20 38 6Z"
                  fill="#f4efe6"
                />
                <path d="M38 6c4 8 12 12 22 12S78 14 82 6" fill="none" stroke="#d9d0c1" strokeWidth="2" />
              </svg>
              <QrMock seed={shop.name} className="absolute left-1/2 top-[40%] w-[30%] -translate-x-1/2" />
            </div>
            <p className="mt-2 text-center text-[0.6rem] leading-tight text-rn-muted">{d.qr}</p>
          </div>
        </div>

        {/* Live address pill */}
        <div data-depth="2" className="absolute left-[2%] top-[6%] sm:left-[-2%]">
          <div className="rn-float rn-bob flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2" style={{ "--d": "-3s" } as React.CSSProperties}>
            <span className="h-2 w-2 rounded-full bg-rn-wa shadow-[0_0_12px_#25d366]" />
            <span className="text-[0.68rem] font-semibold text-rn-cream">{host}</span>
            <span className="text-[0.6rem] text-rn-muted">· {d.live}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
