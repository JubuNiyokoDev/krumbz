"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const ITEMS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/vendeurs", label: "Vendeurs" },
  { href: "/paiements", label: "Paiements" },
  { href: "/statistiques", label: "Statistiques" },
  { href: "/reglages", label: "Réglages" },
  { href: "/sante", label: "Santé" },
  { href: "/journal", label: "Journal" },
];

/** Public paths (admin.<root>/…): the proxy adds the internal /admin prefix. */
function isActive(pathname: string, href: string): boolean {
  const path = pathname.replace(/^\/admin(?=\/|$)/, "") || "/";
  return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
}

export function AdminNav({ logout, userName }: { logout: () => Promise<void>; userName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="shrink-0 font-semibold">
          Rundinova <span className="text-slate-500">Studio · admin</span>
        </Link>
        <button
          type="button"
          className="btn btn-sm ml-auto border border-slate-300 lg:hidden"
          aria-expanded={open}
          aria-controls="admin-menu"
          onClick={() => setOpen((v) => !v)}
        >
          Menu
        </button>
        <nav
          id="admin-menu"
          aria-label="Navigation principale"
          className={`${open ? "flex" : "hidden"} absolute top-full right-0 left-0 flex-col gap-1 border-b border-slate-200 bg-white p-3 lg:static lg:ml-4 lg:flex lg:flex-1 lg:flex-row lg:border-0 lg:p-0`}
        >
          {ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm ${active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="flex items-center gap-2 border-t border-slate-100 pt-2 lg:ml-auto lg:border-0 lg:pt-0">
            <Link href="/mot-de-passe" className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100" title={userName}>
              Mot de passe
            </Link>
            <form action={logout}>
              <button type="submit" className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
                Déconnexion
              </button>
            </form>
          </div>
        </nav>
      </div>
    </header>
  );
}
