import Image from "next/image";
import { ArrowRightIcon, ArrowUpIcon, WhatsAppIcon } from "@/components/ui/Icons";
import logo from "../../../public/brand/rundinova-logo.png";
import { fill, type MarketingContent } from "../content";
import { whatsappUrl } from "../format";
import type { MarketingLocale } from "../types";
import { LanguageLinks } from "../components/LanguageLinks";

/** Closing call to action + footer (RundiNova Tech logo, languages, WhatsApp). */
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
    <footer className="bg-white">
      <div className="rn-container py-20 text-center md:py-28">
        <h2 data-reveal className="mx-auto max-w-[18ch] text-[clamp(2.1rem,1.2rem+4vw,4.8rem)] font-extrabold leading-[1.02] tracking-tight">
          <span className="rn-gradient-text">{f.title}</span>
        </h2>
        <p data-reveal className="mx-auto mt-5 max-w-[30rem] text-lg text-rn-gray">
          {f.text}
        </p>
        <div data-reveal className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <a href="#vitrine" className="rn-btn rn-btn-primary">
            {f.cta}
            <ArrowRightIcon size={18} />
          </a>
          <a href={whatsappUrl(whatsappNumber, f.greeting)} target="_blank" rel="noopener noreferrer" className="rn-btn rn-btn-outline">
            <WhatsAppIcon size={18} />
            {f.whatsapp}
          </a>
        </div>
      </div>
      <div className="border-t border-rn-line">
        <div className="rn-container grid gap-10 py-12 md:grid-cols-[1.2fr_1fr] md:items-end">
          <div>
            <Image src={logo} alt="RundiNova Tech" sizes="180px" className="h-24 w-auto" />
            <p className="mt-4 max-w-[22rem] text-sm leading-relaxed text-rn-gray">{c.footer.tagline}</p>
            <p className="mt-1 text-sm font-semibold text-rn-blue">{c.footer.company}</p>
          </div>
          <div className="flex flex-col items-start gap-5 md:items-end">
            {localeHrefs ? <LanguageLinks current={locale} hrefs={localeHrefs} label={c.nav.language} /> : null}
            <div className="flex items-center gap-5 text-sm font-semibold">
              <span className="text-rn-gray">{c.footer.domain}</span>
              <a href="#accueil" className="inline-flex items-center gap-1.5 text-rn-blue hover:underline">
                {c.footer.top}
                <ArrowUpIcon size={14} />
              </a>
            </div>
          </div>
        </div>
        <p className="rn-container pb-8 text-xs text-rn-gray">{fill(c.footer.rights, { year })}</p>
      </div>
    </footer>
  );
}
