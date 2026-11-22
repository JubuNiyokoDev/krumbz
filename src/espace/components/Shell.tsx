import Link from "next/link";
import type { ReactNode } from "react";
import { espacePath } from "@/lib/auth/guards";
import { logoutAction } from "../actions";
import { ESPACE_LOCALES, type EspaceLocale, type EspaceMessages } from "../i18n";
import { SubmitButton } from "./SubmitButton";

/**
 * Page frame of the vendor space: header (shop, language, logout), navigation,
 * content. `path` is the public path without locale (for the language switch).
 */
export function Shell({
  locale,
  m,
  path,
  shopName,
  nav = true,
  logout = nav,
  children,
}: {
  locale: EspaceLocale;
  m: EspaceMessages;
  path: string;
  shopName?: string;
  nav?: boolean;
  logout?: boolean;
  children: ReactNode;
}) {
  const links = [
    { href: "/", label: m.nav.home },
    { href: "/produits/nouveau", label: m.nav.newProduct },
    { href: "/contacts", label: m.nav.contacts },
    { href: "/mot-de-passe", label: m.nav.password },
  ];
  return (
    <>
      <a className="skip" href="#contenu">
        {m.common.skip}
      </a>
      <header className="top">
        <div className="top-row">
          <p className="brand">
            <span>{m.meta.title}</span>
            {shopName ? <strong>{shopName}</strong> : null}
          </p>
          <nav className="langs" aria-label={m.nav.language}>
            {ESPACE_LOCALES.map((code) => (
              <a key={code} href={espacePath(code, path)} lang={code} hrefLang={code} aria-current={code === locale ? "true" : undefined}>
                {code.toUpperCase()}
              </a>
            ))}
          </nav>
        </div>
        {nav || logout ? (
          <div className="top-row">
            {nav ? (
            <nav className="menu" aria-label={m.nav.menu}>
              {links.map((link) => (
                <Link key={link.href} href={espacePath(locale, link.href)} prefetch={false} aria-current={link.href === path ? "page" : undefined}>
                  {link.label}
                </Link>
              ))}
            </nav>
            ) : null}
            {logout ? (
              <form action={logoutAction.bind(null, locale)} className="logout">
                <SubmitButton className="btn btn-quiet">{m.nav.logout}</SubmitButton>
              </form>
            ) : null}
          </div>
        ) : null}
      </header>
      <main id="contenu" className="main">
        {children}
      </main>
    </>
  );
}
