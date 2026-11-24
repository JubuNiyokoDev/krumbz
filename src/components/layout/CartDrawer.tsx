"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useUi } from "@/hooks/useUi";
import { useModal } from "@/hooks/useModal";
import { BrandMark } from "@/components/ui/BrandMark";
import { ArrowRightIcon, CloseIcon } from "@/components/ui/Icons";
import { CartLineItem } from "@/components/order/CartLineItem";
import { CartTotals } from "@/components/order/CartTotals";
import { useCartLines } from "@/components/order/useCartProducts";

/** Slide-in cart (accessible modal dialog). */
export function CartDrawer() {
  const t = useTranslations("order");
  const common = useTranslations("common");
  const open = useUi((s) => s.cartOpen);
  const setOpen = useUi((s) => s.setCartOpen);
  const panelRef = useRef<HTMLDivElement>(null);
  const { lines, products, hydrated } = useCartLines();
  const close = () => setOpen(false);
  useModal(open, panelRef, close);

  const empty = !hydrated || lines.length === 0;

  return (
    <div id="cart-drawer" data-state={open ? "open" : "closed"} className="fixed inset-0 z-[70]">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        className="drawer-backdrop absolute inset-0 h-full w-full cursor-default bg-navy/45 backdrop-blur-[2px]"
        onClick={close}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        tabIndex={-1}
        className="drawer-panel absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-cream shadow-lift outline-none sm:rounded-l-[2rem]"
      >
        <div className="flex items-center justify-between gap-4 border-b border-navy/10 px-5 py-4 sm:px-7">
          <h2 id="cart-drawer-title" className="font-display text-2xl font-bold">
            {t("cartTitle")}
          </h2>
          <button
            type="button"
            onClick={close}
            className="grid h-11 w-11 place-items-center rounded-full bg-navy/5 transition-transform duration-300 ease-out-back hover:rotate-90 hover:bg-navy/10"
            aria-label={common("close")}
          >
            <CloseIcon size={22} />
          </button>
        </div>

        {empty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <BrandMark className="h-28 w-28 animate-crumb-float" />
            <p className="font-display text-2xl font-semibold">{t("cartEmpty")}</p>
            <p className="text-navy/75">{t("cartEmptyCta")}</p>
            <Link href="/produits" className="btn btn-gold mt-2">
              {common("discoverProducts")}
            </Link>
          </div>
        ) : (
          <>
            <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-7">
              <ul className="divide-y divide-navy/10">
                {lines.map((line) => {
                  const product = products.find((p) => p.id === line.id);
                  return product ? <CartLineItem key={line.id} product={product} quantity={line.quantity} /> : null;
                })}
              </ul>
            </div>
            <div className="space-y-4 border-t border-navy/10 bg-cream-deep/60 px-5 py-5 sm:px-7">
              <CartTotals lines={lines} />
              <Link href={{ pathname: "/commander", hash: "etape-2" }} className="btn btn-primary w-full">
                {t("checkout")}
                <ArrowRightIcon size={20} className="btn-icon btn-icon-arrow" />
              </Link>
              <button type="button" onClick={close} className="w-full rounded-full py-2 font-semibold text-navy/80 underline-offset-4 hover:underline">
                {t("continue")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
