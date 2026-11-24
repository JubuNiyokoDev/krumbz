"use client";

import { useRef, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/use-pathname";
import { useUi } from "@/hooks/useUi";
import { useModal } from "@/hooks/useModal";
import { CloseIcon, PhoneIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { whatsappUrl } from "@/lib/order/whatsapp";
import { Crumbs } from "@/components/ui/Crumbs";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { navItemsFor } from "./nav";
import { useKit } from "@/lib/storefront/kit";

type Phone = { display: string; e164: string };

/** Full-screen mobile navigation (accessible modal dialog, circular reveal). */
export function MobileMenu() {
  const t = useTranslations("nav");
  const brand = useTranslations("brand");
  const { pages } = useKit();
  const NAV_ITEMS = navItemsFor(pages);
  const common = useTranslations("common");
  const contact = useTranslations("contact");
  const pathname = usePathname();
  const open = useUi((s) => s.menuOpen);
  const setOpen = useUi((s) => s.setMenuOpen);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useModal(open, panelRef, close);
  const phones = contact.raw("phones") as Phone[];

  return (
    <div
      id="mobile-menu"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={t("menu")}
      data-state={open ? "open" : "closed"}
      tabIndex={-1}
      className="menu-panel grain fixed inset-0 z-[65] flex flex-col overflow-y-auto bg-navy text-cream outline-none lg:hidden"
      data-lenis-prevent
    >
      <Crumbs className="opacity-60" />
      <div className="flex h-[var(--header-h)] shrink-0 items-center justify-between px-4 sm:px-6">
        <Logo name={brand("name")} tone="light" />
        <button
          type="button"
          onClick={close}
          aria-label={t("closeMenu")}
          className="grid h-12 w-12 place-items-center rounded-full bg-gold text-navy transition-transform duration-300 ease-out-back hover:rotate-90"
        >
          <CloseIcon size={24} />
        </button>
      </div>

      <nav aria-label={t("mainNavigation")} className="flex-1 px-6 pt-6 sm:px-10">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item, i) => (
            <li key={item.href} className="menu-item" style={{ "--i": i } as CSSProperties}>
              <Link
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className="group flex items-baseline gap-4 rounded-2xl py-2 font-display text-[clamp(2.4rem,11vw,4rem)] font-bold leading-[1.05] tracking-tight aria-[current=page]:text-gold-light"
              >
                <span className="font-sans text-sm font-bold text-gold-light/80 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="transition-transform duration-500 ease-out-expo group-hover:translate-x-2">{t(item.key)}</span>
              </Link>
            </li>
          ))}
          {pages.legal ? (
          <li className="menu-item pt-2" style={{ "--i": NAV_ITEMS.length } as CSSProperties}>
            <Link href="/mentions-legales" className="text-base font-semibold text-cream/80 underline-offset-4 hover:underline">
              {t("legal")}
            </Link>
          </li>
          ) : null}
        </ul>
      </nav>

      <div className="menu-item space-y-5 px-6 pb-10 pt-8 sm:px-10" style={{ "--i": NAV_ITEMS.length + 1 } as CSSProperties}>
        <LanguageSwitcher tone="light" size="lg" />
        <div className="flex flex-wrap gap-3">
          <a
            href={whatsappUrl(contact("whatsapp.number"))}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp btn-sm"
          >
            <WhatsAppIcon size={20} />
            {common("whatsapp")}
          </a>
          {phones.map((p) => (
            <a key={p.e164} href={`tel:${p.e164}`} className="btn btn-ghost btn-sm text-cream" aria-label={common("callNumber", { number: p.display })}>
              <PhoneIcon size={18} />
              {p.display}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
