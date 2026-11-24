import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isToComplete } from "@/lib/content";
import { loadStorefrontContent } from "@/templates/boutique/content";
import { MushroomIcon } from "@/components/ui/Icons";
import { whatsappUrl } from "@/lib/order/whatsapp";
import { ArrowUpIcon, MailIcon, PhoneIcon, SocialIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { Crumbs } from "@/components/ui/Crumbs";
import { Logo } from "./Logo";
import { NAV_ITEMS } from "./nav";

const currentYear = () => new Date().getFullYear();

export async function Footer() {
  const locale = await getLocale();
  const c = await loadStorefrontContent(locale);
  const t = await getTranslations("common");
  const socials = c.contact.socials.filter((s) => s.url);
  const year = currentYear();

  return (
    <footer className="grain relative overflow-hidden bg-navy text-cream">
      <Crumbs className="opacity-50" />
      <div className="mx-auto max-w-[88rem] px-4 pb-10 pt-16 sm:px-6 lg:px-10 lg:pt-24">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link href="/" aria-label={c.nav.homeLabel} className="inline-block rounded-full">
              <Logo name={c.brand.name} tone="light" />
            </Link>
            <p className="mt-5 font-display text-2xl font-semibold text-gold-light">{c.brand.tagline}</p>
            <p className="mt-2 text-cream/80">{c.brand.promise}</p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-cream/10 px-4 py-2 text-sm font-semibold">
              <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-gold" />
              {c.brand.origin} ·
              <MushroomIcon size={18} className="text-gold-light" />
              {c.brand.base}
            </p>
          </div>

          <nav aria-label={c.nav.footerNavigation}>
            <h2 className="font-display text-lg font-semibold text-gold-light">{c.footer.navTitle}</h2>
            <ul className="mt-4 space-y-2.5">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-cream/85 underline-offset-4 transition-colors hover:text-cream hover:underline">
                    {c.nav[item.key]}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/mentions-legales" className="text-cream/85 underline-offset-4 transition-colors hover:text-cream hover:underline">
                  {c.nav.legal}
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className="font-display text-lg font-semibold text-gold-light">{c.footer.contactTitle}</h2>
            <ul className="mt-4 space-y-3">
              {c.contact.phones.map((p) => (
                <li key={p.e164}>
                  <a href={`tel:${p.e164}`} className="inline-flex items-center gap-2.5 text-cream/90 hover:text-cream" aria-label={t("callNumber", { number: p.display })}>
                    <PhoneIcon size={18} className="text-gold-light" />
                    {p.display}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={whatsappUrl(c.contact.whatsapp.number)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-cream/90 hover:text-cream"
                >
                  <WhatsAppIcon size={18} className="text-gold-light" />
                  {c.common.whatsapp} · {c.contact.whatsapp.display}
                </a>
              </li>
              {!isToComplete(c.contact.email) && c.contact.email ? (
                <li>
                  <a href={`mailto:${c.contact.email}`} className="inline-flex items-center gap-2.5 text-cream/90 hover:text-cream">
                    <MailIcon size={18} className="text-gold-light" />
                    {c.contact.email}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          {socials.length > 0 ? (
            <div>
              <h2 className="font-display text-lg font-semibold text-gold-light">{c.contactPage.socialTitle}</h2>
              <ul className="mt-4 flex flex-wrap gap-3">
                {socials.map((s) => (
                  <li key={s.network}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="grid h-12 w-12 place-items-center rounded-full bg-cream/10 transition-all duration-300 ease-out-back hover:-translate-y-1 hover:bg-gold hover:text-navy"
                    >
                      <SocialIcon network={s.network} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <p aria-hidden className="pointer-events-none mt-14 select-none text-center font-display text-[clamp(5rem,24vw,22rem)] font-bold leading-[0.8] tracking-tight text-gold">
          {c.brand.name}
        </p>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-cream/15 pt-6 text-sm text-cream/80 sm:flex-row">
          <p>{t("rights", { year: String(year), company: c.brand.company })}</p>
          <p className="inline-flex items-center gap-2">
            <span aria-hidden>♥</span>
            {c.common.madeIn}
          </p>
          <a href="#contenu" className="inline-flex items-center gap-2 rounded-full px-3 py-2 font-semibold text-cream hover:bg-cream/10">
            <ArrowUpIcon size={16} />
            {c.footer.backToTop}
          </a>
        </div>
      </div>
    </footer>
  );
}
