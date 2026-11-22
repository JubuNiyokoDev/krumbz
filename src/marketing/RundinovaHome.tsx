import "./rundinova.css";
import { getMarketingContent } from "./content";
import { inter, syne } from "./fonts";
import { marketingLocaleHrefs } from "./metadata";
import type { RundinovaHomeProps } from "./types";
import { MotionRoot } from "./components/MotionRoot";
import { Header } from "./components/Header";
import { Hero } from "./sections/Hero";
import { Marquee } from "./sections/Marquee";
import { HowItWorks } from "./sections/HowItWorks";
import { Shops } from "./sections/Shops";
import { WhyImage } from "./sections/WhyImage";
import { Offer } from "./sections/Offer";
import { Faq } from "./sections/Faq";
import { Contact } from "./sections/Contact";
import { Footer } from "./sections/Footer";

/**
 * Rundinova Studio marketing home (isoko.rundinova.com).
 * Server component: renders inside any root layout (no <html>/<body>); it
 * brings its own fonts and stylesheet. Texts: content/rundinova/<locale>.json.
 */
export function RundinovaHome({
  locale,
  offer,
  shops,
  whatsappNumber,
  localeHrefs = marketingLocaleHrefs(),
}: RundinovaHomeProps) {
  const c = getMarketingContent(locale);

  return (
    <MotionRoot className={`rn-root ${syne.variable} ${inter.variable}`}>
      <a
        href="#contenu"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-rn-cream px-5 py-3 font-semibold text-rn-ink transition-transform focus:translate-y-0"
      >
        {c.nav.skip}
      </a>
      <Header text={c.nav} locale={locale} localeHrefs={localeHrefs} />
      <main id="contenu" tabIndex={-1} className="outline-none">
        <Hero c={c} shop={shops[0]} />
        <Marquee c={c} />
        <HowItWorks c={c} />
        <Shops c={c} shops={shops} />
        <WhyImage c={c} />
        <Offer c={c} offer={offer} locale={locale} />
        <Faq c={c} offer={offer} locale={locale} />
        <Contact c={c} whatsappNumber={whatsappNumber} />
      </main>
      <Footer c={c} whatsappNumber={whatsappNumber} locale={locale} localeHrefs={localeHrefs} />
    </MotionRoot>
  );
}
