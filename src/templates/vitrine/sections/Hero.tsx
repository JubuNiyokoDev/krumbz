import Link from "next/link";
import { whatsappUrl } from "@/lib/order/whatsapp";
import { tx } from "../lib/i18n";
import type { View } from "../lib/view";
import { Parallax } from "../components/Parallax";
import { Relief } from "../components/Relief";
import { Icon, Img, Price, SplitWords, WhatsAppIcon } from "../components/primitives";

export function Hero({ view }: { view: View }) {
  const { tenant, content, locale, ui, featured, links } = view;
  const title = tx(content.hero.title, locale) || tenant.name;
  const text = tx(content.hero.text, locale);
  const eyebrow = tx(content.hero.eyebrow, locale) || tx(content.tagline, locale);
  const image = featured?.images[0];

  return (
    <section className="vt-hero" aria-labelledby="vt-hero-title">
      <div className="vt-wrap grid items-center gap-10 pb-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
        <div className="relative z-10 flex flex-col items-start gap-6">
          {eyebrow && (
            <p className="vt-eyebrow vt-hero__fade" style={{ ["--d" as string]: "0ms" }}>
              {eyebrow}
            </p>
          )}
          <h1 id="vt-hero-title" className="vt-h1 vt-hero__title">
            <SplitWords text={title} />
          </h1>
          {text && (
            <p className="vt-lead vt-hero__fade" style={{ ["--d" as string]: "420ms" }}>
              {text}
            </p>
          )}
          <div className="vt-hero__fade flex flex-wrap gap-3" style={{ ["--d" as string]: "560ms" }}>
            <Link href={links.products} className="vt-btn">
              {tx(content.hero.cta, locale) || ui.allProducts} <Icon name="arrow" className="vt-arrow size-5" />
            </Link>
            <a href={whatsappUrl(tenant.contact.whatsapp)} className="vt-btn vt-btn--ghost" target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon /> {tx(content.hero.ctaSecondary, locale) || ui.orderWhatsApp}
            </a>
          </div>
          {content.promises.length > 0 && (
            <ul className="vt-hero__fade mt-2 flex flex-wrap gap-2" style={{ ["--d" as string]: "700ms" }}>
              {content.promises.slice(0, 3).map((p) => (
                <li key={p.title.fr} className="vt-chip">
                  <Icon name="check" className="size-4 vt-accent-text" /> {tx(p.title, locale)}
                </li>
              ))}
            </ul>
          )}
        </div>

        {featured && image && (
          <Parallax className="relative mx-auto aspect-square w-full max-w-[36rem]">
            <div aria-hidden className="vt-hero__halo vt-par" style={{ ["--depth" as string]: -8 }} />
            <div aria-hidden className="vt-hero__ring" />
            <Link href={links.product[featured.slug]} className="vt-par absolute inset-[9%] block" style={{ ["--depth" as string]: 14 }} aria-label={`${tx(featured.name, locale)} — ${ui.viewProduct}`}>
              <Relief className="size-full" max={8}>
                <div className="vt-relief__media absolute inset-[4%] grid place-items-center">
                  <Img
                    src={image.url}
                    alt={tx(image.alt, locale)}
                    width={image.width}
                    height={image.height}
                    priority
                    className="size-full object-contain"
                  />
                </div>
              </Relief>
            </Link>
            <div className="vt-par absolute -left-2 bottom-[16%] sm:left-0" style={{ ["--depth" as string]: 26 }}>
              <div className="vt-float">
                <div className="vt-chip vt-hero__fade flex-col !items-start !gap-0 !rounded-[1.1rem] !px-4 !py-2.5" style={{ ["--d" as string]: "900ms" }}>
                  <span className="vt-muted text-xs font-semibold">{tx(featured.name, locale)}</span>
                  <Price price={featured.price} compareAt={featured.compareAtPrice} onRequest={ui.priceOnRequest} className="text-base" />
                </div>
              </div>
            </div>
            {featured.modelUrl && (
              <div className="vt-par absolute right-0 top-[14%]" style={{ ["--depth" as string]: 30 }}>
                <div className="vt-float" style={{ ["--d" as string]: "-2s" }}>
                  <span className="vt-chip vt-hero__fade" style={{ ["--d" as string]: "1050ms" }}>
                    <Icon name="cube" className="size-4 vt-accent-text" /> {ui.view3d}
                  </span>
                </div>
              </div>
            )}
          </Parallax>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-6 hidden justify-center md:flex">
        <span className="vt-scroll-cue">
          {ui.scroll}
          <i />
        </span>
      </div>
    </section>
  );
}
