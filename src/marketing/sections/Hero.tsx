import type { CSSProperties } from "react";
import Image from "next/image";
import { ArrowRightIcon, WhatsAppIcon } from "@/components/ui/Icons";
import mark from "../../../public/brand/rundinova-mark.png";
import { fill, type MarketingContent } from "../content";
import { displayHost } from "../format";
import type { MarketingShop } from "../types";
import { QrMock } from "../components/QrMock";
import { ShopImage } from "../components/ShopImage";

const d = (n: number) => ({ "--d": n }) as CSSProperties;

/**
 * Hero: the promise in big bold Montserrat (LCP = the h1, no image needed), a phone showing the
 * first partner shop, and floating proofs (WhatsApp message, the QR shirt, the live address).
 */
export function Hero({ c, shop }: { c: MarketingContent; shop?: MarketingShop }) {
  const h = c.hero;
  const name = shop?.name ?? "Krumbz";
  const accent = shop?.colors?.accent ?? "#08b8f0";
  const primary = shop?.colors?.primary ?? "#0008b8";
  return (
    <section id="accueil" data-hero className="rn-hero-bg relative overflow-hidden pb-20 pt-28 sm:pt-32 lg:pb-28 lg:pt-40">
      <div aria-hidden className="rn-grid-bg pointer-events-none absolute inset-0" />
      <Image
        src={mark}
        alt=""
        aria-hidden
        sizes="60vw"
        className="pointer-events-none absolute -right-[12%] top-[8%] w-[70vw] max-w-[980px] opacity-[0.045] lg:-right-[6%]"
      />
      <div className="rn-container relative grid items-center gap-16 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10">
        <div>
          <p className="rn-kicker rn-hero-in">{h.kicker}</p>
          <h1 className="mt-6 text-[clamp(2.45rem,1rem+4.3vw,4.7rem)] font-extrabold leading-[1]">
            <span className="rn-hero-in block" style={d(1)}>
              {h.title}
            </span>
            <span className="rn-hero-in rn-gradient-text block pb-[0.08em]" style={d(2)}>
              {h.titleAccent}
            </span>
          </h1>
          <p className="rn-hero-in mt-7 max-w-[36rem] text-[1.06rem] leading-relaxed text-rn-gray sm:text-lg" style={d(3)}>
            {h.lead}
          </p>
          <div className="rn-hero-in mt-9 flex flex-col gap-3 sm:flex-row sm:items-center" style={d(4)}>
            <a href="#vitrine" className="rn-btn rn-btn-primary">
              {h.ctaPrimary}
              <ArrowRightIcon size={18} />
            </a>
            {shop ? (
              <a href={shop.url} target="_blank" rel="noopener noreferrer" className="rn-btn rn-btn-outline">
                {fill(h.ctaSecondary, { name })}
              </a>
            ) : null}
          </div>
          <p className="rn-hero-in mt-10 flex items-center gap-3 text-sm font-semibold text-rn-gray" style={d(5)}>
            <Image src={mark} alt="" aria-hidden sizes="40px" className="h-5 w-auto" />
            {c.brand}
          </p>
        </div>

        {/* Device */}
        <div className="relative mx-auto w-full max-w-[25rem] [perspective:1400px] lg:max-w-[27rem]" aria-hidden={!shop}>
          <div aria-hidden className="rn-orbit absolute -inset-[18%] rounded-full border border-dashed border-rn-blue/15" />
          <div aria-hidden className="absolute -inset-[8%] rounded-full bg-[radial-gradient(circle,rgb(8_184_240/0.25),transparent_65%)]" />
          <div data-stage-scroll className="relative [perspective:1300px]">
            <div data-depth="1" className="rn-phone relative mx-auto w-[78%] [transform:rotateY(-14deg)_rotateX(6deg)]">
              <div className="overflow-hidden rounded-[2.1rem] bg-white">
                <div className="flex items-center justify-between px-5 pb-2 pt-3 text-[0.62rem] font-bold text-black">
                  <span>9:41</span>
                  <span className="h-4 w-16 rounded-full bg-black" />
                  <span className="tracking-widest">•••</span>
                </div>
                <div className="mx-3 rounded-full bg-rn-mist px-3 py-1.5 text-center text-[0.6rem] font-semibold text-rn-gray">
                  {shop ? displayHost(shop.url) : "votre-boutique.rundinova.com"}
                </div>
                <div className="relative mx-3 mt-3 aspect-[4/3.4] overflow-hidden rounded-2xl" style={{ background: primary }}>
                  {shop ? <ShopImage src={shop.imageUrl} alt={fill(h.device.imageAlt, { name })} sizes="320px" preload className="object-cover" fallbackLabel={name} /> : null}
                </div>
                <div className="px-4 pb-4 pt-3">
                  <p className="text-base font-extrabold tracking-tight" style={{ color: primary }}>
                    {name}
                  </p>
                  {shop?.tagline ? <p className="mt-0.5 line-clamp-2 text-[0.66rem] leading-snug text-rn-gray">{shop.tagline}</p> : null}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[0.95, 0.7, 0.45].map((o) => (
                      <span key={o} className="aspect-square rounded-xl" style={{ background: accent, opacity: o }} />
                    ))}
                  </div>
                  <span className="mt-3 flex items-center justify-center gap-1.5 rounded-full bg-rn-cyan py-2.5 text-[0.68rem] font-bold text-black">
                    <WhatsAppIcon size={13} />
                    {h.device.order}
                  </span>
                </div>
              </div>
            </div>

            <div data-depth="2.2" className="rn-chip rn-float absolute right-0 top-[16%] z-10 w-[12.5rem] p-3 sm:-right-10 sm:w-[13.5rem]">
              <div className="flex items-center gap-2.5">
                <span className="rn-ping grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rn-cyan text-black">
                  <WhatsAppIcon size={16} />
                </span>
                <span className="text-xs font-bold">{h.device.chatTitle}</span>
              </div>
              <p className="mt-2 rounded-xl bg-rn-mist px-3 py-2 text-[0.7rem] leading-snug text-black">{h.device.chatMessage}</p>
            </div>

            <div data-depth="1.6" className="rn-chip rn-float-slow absolute left-0 bottom-[10%] z-10 w-[8.5rem] p-3 text-center sm:-left-12 sm:w-[9.5rem]">
              <QrMock seed={shop?.url ?? "rundinova"} className="mx-auto h-16 w-16" />
              <p className="mt-2 text-[0.62rem] font-semibold leading-tight text-rn-gray">{h.device.qr}</p>
            </div>

            <div data-depth="2.8" className="rn-chip absolute left-0 -top-[3%] z-10 flex items-center gap-2 px-3 py-2 text-[0.68rem] font-bold sm:-left-14">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rn-cyan opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rn-cyan" />
              </span>
              <span>{shop ? displayHost(shop.url) : ".rundinova.com"}</span>
              <span className="text-rn-blue">· {h.device.live}</span>
            </div>
          </div>
        </div>
      </div>
      <a href="#comment" className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.3em] text-rn-gray lg:flex">
        {h.scroll}
        <span className="h-10 w-[2px] overflow-hidden rounded bg-rn-line">
          <span className="block h-1/2 w-full animate-[rn-scrolldot_1.8s_ease-in-out_infinite] bg-rn-blue motion-reduce:animate-none" />
        </span>
      </a>
    </section>
  );
}
