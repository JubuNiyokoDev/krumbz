import Link from "next/link";
import { whatsappUrl } from "@/lib/order/whatsapp";
import { prettyPhone } from "../lib/format";
import { tx, LOCALE_NAMES } from "../lib/i18n";
import type { View } from "../lib/view";
import { Icon, WhatsAppIcon } from "./primitives";

export function Footer({ view }: { view: View }) {
  const { tenant, content, locale, ui, links } = view;
  const { contact } = tenant;
  const tagline = tx(content.tagline, locale);
  const note = tx(content.footerNote, locale);
  const year = new Date().getFullYear();

  return (
    <footer className="vt-footer">
      <div className="vt-wrap grid gap-12 py-16 md:grid-cols-[1.3fr_1fr_1fr]">
        <div className="grid content-start gap-4">
          <span className="vt-logo-text !text-[1.8rem]">{tenant.name}</span>
          {tagline && <p className="max-w-sm opacity-80">{tagline}</p>}
          <a href={whatsappUrl(contact.whatsapp)} className="vt-btn vt-btn--wa vt-btn--sm w-fit" target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon /> {ui.writeUs}
          </a>
        </div>
        <nav aria-label={ui.menu} className="grid content-start gap-2.5 font-semibold">
          <Link href={links.home} className="vt-link-underline w-fit">{ui.home}</Link>
          <Link href={links.products} className="vt-link-underline w-fit">{ui.products}</Link>
          <Link href={links.order} className="vt-link-underline w-fit">{ui.order}</Link>
          <Link href={links.contact} className="vt-link-underline w-fit">{ui.contact}</Link>
        </nav>
        <div className="grid content-start gap-3 text-[0.95rem]">
          {contact.phones[0] && (
            <a href={`tel:${contact.phones[0]}`} className="flex items-center gap-2.5 opacity-90">
              <Icon name="phone" className="size-4" /> {prettyPhone(contact.phones[0])}
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2.5 opacity-90">
              <Icon name="mail" className="size-4" /> {contact.email}
            </a>
          )}
          {(contact.address || contact.city) && (
            <p className="flex items-start gap-2.5 opacity-90">
              <Icon name="pin" className="mt-0.5 size-4 shrink-0" /> {[contact.address, contact.city].filter(Boolean).join(", ")}
            </p>
          )}
          {contact.socials.length > 0 && (
            <ul className="mt-1 flex flex-wrap gap-2" aria-label={ui.socials}>
              {contact.socials.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="vt-footer__pill">
                    {s.network}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="vt-wrap grid gap-3 border-t py-6 text-sm" style={{ borderColor: "color-mix(in oklab, currentColor 18%, transparent)" }}>
        {note && <p className="opacity-80">{note}</p>}
        {content.credits.length > 0 && (
          <div className="opacity-75">
            <span className="font-bold">{ui.credits} : </span>
            {content.credits.map((c, i) => (
              <span key={c.fr}>
                {i > 0 && " · "}
                {tx(c, locale)}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 opacity-75">
          <span>
            © {year} {tenant.name} · {ui.poweredBy}
          </span>
          {links.locales.length > 1 && (
            <span className="flex gap-3" role="group" aria-label={ui.language}>
              {links.locales.map((l) => (
                <Link key={l.locale} href={l.href} lang={LOCALE_NAMES[l.locale].htmlLang} hrefLang={LOCALE_NAMES[l.locale].htmlLang} aria-current={l.locale === locale} className="vt-link-underline" data-no-transition>
                  {LOCALE_NAMES[l.locale].name}
                </Link>
              ))}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
