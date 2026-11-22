import { ArrowUpIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { Magnetic } from "@/components/ui/Magnetic";
import type { MarketingContent } from "../content";
import { fill } from "../content";
import { whatsappUrl } from "../format";
import type { MarketingLocale } from "../types";
import { Split } from "../components/Split";
import { Wordmark } from "../components/Logo";
import { LanguageLinks } from "../components/LanguageLinks";

export function Footer({
  c,
  whatsappNumber,
  locale,
  localeHrefs,
}: {
  c: MarketingContent;
  whatsappNumber: string;
  locale: MarketingLocale;
  localeHrefs?: Partial<Record<MarketingLocale, string>>;
}) {
  const f = c.final;
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-[70] overflow-hidden bg-rn-ink text-rn-cream">
      <div className="mx-auto max-w-[1320px] px-5 pt-20 sm:px-8 md:pt-28">
        <div className="flex flex-col gap-10 border-t border-white/10 pt-16 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 data-split className="max-w-[14ch] text-[clamp(2.3rem,6vw,5rem)] font-bold leading-[0.95]">
              <Split text={f.title} />
            </h2>
            <p data-reveal className="mt-5 text-lg text-rn-muted">
              {f.text}
            </p>
          </div>
          <div data-reveal className="flex flex-wrap gap-3">
            <Magnetic>
              <a href="#vitrine" className="rn-btn rn-btn-nova">
                {f.cta}
              </a>
            </Magnetic>
            <a href={whatsappUrl(whatsappNumber, f.greeting)} target="_blank" rel="noopener noreferrer" className="rn-btn rn-btn-ghost text-rn-cream">
              <WhatsAppIcon size={20} />
              {f.whatsapp}
            </a>
          </div>
        </div>

        <div className="mt-20 grid gap-8 text-sm text-rn-muted md:grid-cols-3 md:items-center">
          <div className="text-rn-cream">
            <Wordmark />
            <p className="mt-3 max-w-[20rem] text-rn-muted">{c.footer.tagline}</p>
          </div>
          <div className="md:justify-self-center">
            {localeHrefs ? <LanguageLinks current={locale} hrefs={localeHrefs} label={c.nav.language} /> : null}
          </div>
          <div className="flex items-center gap-6 md:justify-self-end">
            <span>{c.footer.domain}</span>
            <a href="#accueil" className="inline-flex items-center gap-1.5 font-semibold text-rn-cream">
              {c.footer.top}
              <ArrowUpIcon size={16} />
            </a>
          </div>
        </div>
        <p className="mt-8 pb-6 text-xs text-rn-muted">{fill(c.footer.rights, { year })}</p>
      </div>
      <p aria-hidden className="rn-giant -mb-[0.12em] select-none whitespace-nowrap text-center text-[12.8vw]">
        rundinova
      </p>
    </footer>
  );
}
