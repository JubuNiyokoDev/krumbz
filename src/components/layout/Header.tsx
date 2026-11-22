"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/use-pathname";
import { useCart, useCartCount } from "@/store/cart";
import { useUi } from "@/hooks/useUi";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { CartIcon, MenuIcon } from "@/components/ui/Icons";
import { CART_BUMP_EVENT } from "@/components/order/cart-fx";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { NAV_ITEMS } from "./nav";

/**
 * Fixed header: transparent at the top of the page, solid once scrolled,
 * hidden while scrolling down and shown again when scrolling up.
 */
export function Header() {
  const t = useTranslations("nav");
  const brand = useTranslations("brand");
  const pathname = usePathname();
  const menuOpen = useUi((s) => s.menuOpen);
  const setMenuOpen = useUi((s) => s.setMenuOpen);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled(y > 24);
      if (Math.abs(y - last) > 8) {
        setHidden(y > last && y > 240);
        last = y;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      data-hidden={hidden ? "true" : "false"}
      className={`site-header fixed inset-x-0 top-0 z-50 ${scrolled ? "bg-cream/88 shadow-[0_10px_30px_-20px_rgb(18_38_74/0.45)] backdrop-blur-md" : "bg-transparent"}`}
    >
      <div className="mx-auto flex h-[var(--header-h)] max-w-[88rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Link href="/" aria-label={t("homeLabel")} className="rounded-full">
          <Logo name={brand("name")} />
        </Link>

        <nav aria-label={t("mainNavigation")} className="hidden lg:block">
          <ul className="flex items-center gap-1 rounded-full bg-cream/70 px-2 py-1 ring-1 ring-navy/10 backdrop-blur">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="nav-link block rounded-full px-4 py-3 font-display text-[1.02rem] font-semibold text-navy transition-colors hover:text-rust"
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          <CartButton />
          <button
            type="button"
            className="grid h-12 w-12 place-items-center rounded-full bg-navy text-cream transition-transform duration-300 ease-out-back hover:scale-105 active:scale-95 lg:hidden"
            aria-label={t("openMenu")}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon size={24} />
          </button>
        </div>
      </div>
    </header>
  );
}

function CartButton() {
  const t = useTranslations("nav");
  const count = useCartCount();
  const hydrated = useCart((s) => s.hydrated);
  const cartOpen = useUi((s) => s.cartOpen);
  const setCartOpen = useUi((s) => s.setCartOpen);
  const shown = hydrated ? count : 0;
  const badgeRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    const before = previous.current;
    previous.current = shown;
    if (before === null || shown <= before || !badgeRef.current || prefersReducedMotion()) return;
    gsap.fromTo(badgeRef.current, { scale: 1.9 }, { scale: 1, duration: 0.8, ease: "elastic.out(1, 0.35)", overwrite: true });
  }, [shown, hydrated]);

  useEffect(() => {
    const onBump = () => {
      if (!iconRef.current || prefersReducedMotion()) return;
      gsap.fromTo(iconRef.current, { rotate: -18, y: -3 }, { rotate: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.3)", overwrite: true });
    };
    window.addEventListener(CART_BUMP_EVENT, onBump);
    return () => window.removeEventListener(CART_BUMP_EVENT, onBump);
  }, []);

  return (
    <button
      type="button"
      data-cart-target
      onClick={() => setCartOpen(true)}
      aria-label={t("openCart", { count: shown })}
      aria-haspopup="dialog"
      aria-expanded={cartOpen}
      aria-controls="cart-drawer"
      className="relative grid h-12 w-12 place-items-center rounded-full bg-gold text-navy shadow-biscuit transition-transform duration-300 ease-out-back hover:scale-105 active:scale-95"
    >
      <span ref={iconRef} className="grid place-items-center">
        <CartIcon size={23} />
      </span>
      <span
        ref={badgeRef}
        aria-hidden
        className={`cart-badge absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-navy px-1.5 font-display text-xs font-bold text-cream ring-2 ring-cream transition-opacity ${shown > 0 ? "opacity-100" : "scale-0 opacity-0"}`}
      >
        {shown > 99 ? "99+" : shown}
      </span>
    </button>
  );
}
