"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart, useVitrine } from "../lib/context";
import { fill, LOCALE_NAMES } from "../lib/i18n";
import type { VitrinePage } from "../lib/links";
import { lockScroll, useVitrineUi } from "../lib/ui";
import { Icon, Img } from "./primitives";

export function Header({ page, logoUrl, showLanguages }: { page: VitrinePage; logoUrl: string | null; showLanguages: boolean }) {
  const { ui, links, shopName, locale } = useVitrine();
  const lines = useCart()((s) => s.lines);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const addedTick = useVitrineUi((s) => s.addedTick);
  const menuOpen = useVitrineUi((s) => s.menuOpen);
  const setMenuOpen = useVitrineUi((s) => s.setMenuOpen);
  const setCartOpen = useVitrineUi((s) => s.setCartOpen);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      setHidden(y > 320 && y > lastY.current + 4);
      if (y < lastY.current - 4 || y < 320) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    // Show the header (and its cart badge) whenever something is added.
    const unsubscribe = useVitrineUi.subscribe((s, prev) => s.addedTick !== prev.addedTick && setHidden(false));
    return () => {
      window.removeEventListener("scroll", onScroll);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    lockScroll(true);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      lockScroll(false);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, setMenuOpen]);

  const nav: { page: VitrinePage; href: string; label: string }[] = [
    { page: "home", href: links.home, label: ui.home },
    { page: "products", href: links.products, label: ui.products },
    { page: "order", href: links.order, label: ui.order },
    { page: "contact", href: links.contact, label: ui.contact },
  ];
  const isCurrent = (p: VitrinePage) => p === page || (p === "products" && page === "product");

  return (
    <>
      <header className="vt-header" data-scrolled={scrolled || menuOpen} data-hidden={hidden && !menuOpen}>
        <div className="vt-wrap flex items-center justify-between gap-4">
          <Link href={links.home} className="flex items-center gap-2.5" aria-label={`${shopName} — ${ui.home}`}>
            {logoUrl ? <Img src={logoUrl} alt="" className="h-9 w-auto" priority /> : null}
            <span className="vt-logo-text">{shopName}</span>
          </Link>

          <nav aria-label={ui.menu} className="hidden items-center gap-7 text-[0.95rem] font-semibold lg:flex">
            {nav.map((item) => (
              <Link key={item.page} href={item.href} className="vt-link-underline py-1" aria-current={isCurrent(item.page) ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            {showLanguages && links.locales.length > 1 && (
              <div className="vt-lang hidden sm:flex" role="group" aria-label={ui.language}>
                {links.locales.map((l) => (
                  <Link key={l.locale} href={l.href} hrefLang={LOCALE_NAMES[l.locale].htmlLang} lang={LOCALE_NAMES[l.locale].htmlLang} aria-current={l.locale === locale} title={LOCALE_NAMES[l.locale].name} data-no-transition>
                    {LOCALE_NAMES[l.locale].short}
                  </Link>
                ))}
              </div>
            )}
            <button type="button" className="vt-icon-btn relative" onClick={() => setCartOpen(true)} aria-label={fill(ui.openCart, { count })} data-cart-target>
              <Icon name="cart" />
              {count > 0 && (
                <span key={addedTick} className="vt-badge" data-bump={addedTick > 0} aria-hidden>
                  {count}
                </span>
              )}
            </button>
            <button type="button" className="vt-icon-btn lg:hidden" onClick={() => setMenuOpen(true)} aria-label={ui.menu} aria-expanded={menuOpen}>
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="vt-menu" role="dialog" aria-modal="true" aria-label={ui.menu}>
          <div className="flex items-center justify-between">
            <span className="vt-logo-text">{shopName}</span>
            <button type="button" className="vt-icon-btn" style={{ color: "inherit", background: "transparent" }} onClick={() => setMenuOpen(false)} aria-label={ui.closeMenu} autoFocus>
              <Icon name="close" />
            </button>
          </div>
          <nav aria-label={ui.menu} className="mt-auto mb-10 grid gap-2">
            {nav.map((item, i) => (
              <Link key={item.page} href={item.href} style={{ animationDelay: `${80 + i * 70}ms` }} aria-current={isCurrent(item.page) ? "page" : undefined} onClick={() => setMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
          </nav>
          {showLanguages && links.locales.length > 1 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label={ui.language}>
              {links.locales.map((l) => (
                <Link
                  key={l.locale}
                  href={l.href}
                  lang={LOCALE_NAMES[l.locale].htmlLang}
                  className="rounded-full px-4 py-2 text-sm font-bold"
                  style={{ boxShadow: "inset 0 0 0 1.5px currentColor", opacity: l.locale === locale ? 1 : 0.65 }}
                  aria-current={l.locale === locale}
                  data-no-transition
                >
                  {LOCALE_NAMES[l.locale].name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
