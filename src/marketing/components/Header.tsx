"use client";

import { useEffect, useRef } from "react";
import { ArrowRightIcon } from "@/components/ui/Icons";
import type { MarketingLocale } from "../types";
import { Wordmark } from "./Logo";
import { LanguageLinks } from "./LanguageLinks";

export interface HeaderText {
  home: string;
  main: string;
  how: string;
  shops: string;
  offer: string;
  faq: string;
  cta: string;
  ctaShort: string;
  language: string;
}

/** Fixed header: transparent over the hero, glass once scrolled, hides while scrolling down. */
export function Header({
  text: t,
  locale,
  localeHrefs,
}: {
  text: HeaderText;
  locale: MarketingLocale;
  localeHrefs?: Partial<Record<MarketingLocale, string>>;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      el.dataset.scrolled = String(y > 24);
      // Never hide while focus is inside (keyboard users).
      el.dataset.hidden = String(y > 480 && y > last + 4 && !el.contains(document.activeElement));
      if (Math.abs(y - last) > 4) last = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const links = [
    { href: "#comment", label: t.how },
    { href: "#boutiques", label: t.shops },
    { href: "#offre", label: t.offer },
    { href: "#questions", label: t.faq },
  ];

  return (
    <header ref={ref} className="rn-header fixed inset-x-0 top-0 z-[90] text-rn-cream" onFocus={() => ref.current && (ref.current.dataset.hidden = "false")}>
      <div className="mx-auto flex h-[4.5rem] max-w-[1320px] items-center justify-between gap-4 px-5 sm:px-8 md:h-20">
        <a href="#accueil" aria-label={t.home} className="shrink-0">
          <Wordmark compact />
        </a>
        <nav aria-label={t.main} className="hidden lg:block">
          <ul className="flex items-center gap-8 text-[0.92rem] font-medium">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="rn-navlink">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          {localeHrefs ? (
            <>
              <LanguageLinks current={locale} hrefs={localeHrefs} label={t.language} className="hidden md:block" />
              <details className="relative md:hidden">
                <summary className="grid h-10 min-w-10 cursor-pointer list-none place-items-center rounded-full px-2 text-xs font-bold uppercase tracking-wider shadow-[inset_0_0_0_1.5px_rgb(244_239_230/0.35)] [&::-webkit-details-marker]:hidden">
                  <span className="sr-only">{t.language} : </span>
                  {locale}
                </summary>
                <div className="absolute right-0 top-12 rounded-2xl bg-rn-ink-2 p-1.5 shadow-[0_20px_40px_-15px_rgb(0_0_0/0.7),inset_0_0_0_1px_rgb(255_255_255/0.08)]">
                  <LanguageLinks current={locale} hrefs={localeHrefs} label={t.language} />
                </div>
              </details>
            </>
          ) : null}
          <a href="#vitrine" className="rn-btn rn-btn-nova !min-h-[2.75rem] whitespace-nowrap !px-3.5 text-sm sm:!px-5">
            {/* Short label on phones and next to the full nav (lg), long label otherwise. */}
            <span className="hidden sm:inline lg:hidden xl:inline">{t.cta}</span>
            <span className="sm:hidden lg:inline xl:hidden">{t.ctaShort}</span>
            <ArrowRightIcon size={16} className="hidden sm:block" />
          </a>
        </div>
      </div>
    </header>
  );
}
