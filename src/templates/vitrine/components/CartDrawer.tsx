"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { formatPrice } from "@/lib/order/whatsapp";
import { useCart, useVitrine } from "../lib/context";
import { lockScroll, useVitrineUi } from "../lib/ui";
import { Icon, Img } from "./primitives";
import { Stepper } from "./Stepper";

export function CartDrawer() {
  const { ui, catalog, links } = useVitrine();
  const open = useVitrineUi((s) => s.cartOpen);
  const setOpen = useVitrineUi((s) => s.setCartOpen);
  const store = useCart();
  const lines = store((s) => s.lines);
  const setQuantity = store((s) => s.setQuantity);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    lockScroll(true);
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      lockScroll(false);
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, setOpen]);

  if (!open) return null;

  const items = lines
    .map((line) => ({ line, product: catalog.find((p) => p.id === line.id) }))
    .filter((x): x is { line: typeof x.line; product: NonNullable<typeof x.product> } => Boolean(x.product));
  const unknown = items.some((x) => x.product.price === null);
  const subtotal = items.reduce((sum, x) => sum + (x.product.price ?? 0) * x.line.quantity, 0);

  return (
    <>
      <div className="vt-backdrop" onClick={() => setOpen(false)} aria-hidden />
      <div ref={panel} className="vt-drawer" role="dialog" aria-modal="true" aria-label={ui.cart} tabIndex={-1} data-lenis-prevent>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--vt-line)" }}>
          <h2 className="vt-h3">{ui.cart}</h2>
          <button type="button" className="vt-icon-btn" onClick={() => setOpen(false)} aria-label={ui.closeCart}>
            <Icon name="close" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="grid place-items-center gap-4 py-16 text-center">
              <Icon name="cart" className="size-12 opacity-40" />
              <p className="vt-muted">{ui.cartEmpty}</p>
              <Link href={links.products} className="vt-btn vt-btn--ghost vt-btn--sm" onClick={() => setOpen(false)}>
                {ui.allProducts}
              </Link>
            </div>
          ) : (
            <ul className="grid gap-4">
              {items.map(({ line, product }) => (
                <li key={`${line.id}:${line.option ?? ""}`} className="flex gap-3.5">
                  <Link href={product.href} className="size-20 shrink-0 overflow-hidden rounded-[min(var(--vt-radius-control),1rem)]" style={{ background: "var(--vt-bg)" }} onClick={() => setOpen(false)}>
                    {product.image && <Img src={product.image.url} alt={product.image.alt} className="size-full object-cover" />}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <p className="truncate font-bold">{product.name}</p>
                    {line.option && <p className="vt-muted text-sm">{line.option}</p>}
                    <div className="flex items-center justify-between gap-2">
                      <Stepper small value={line.quantity} onChange={(q) => setQuantity(line.id, line.option, q)} label={product.name} allowZero />
                      <span className="text-sm font-bold">{product.price !== null ? formatPrice(product.price * line.quantity) : ui.priceOnRequest}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {items.length > 0 && (
          <div className="grid gap-3 border-t px-5 py-5" style={{ borderColor: "var(--vt-line)" }}>
            <div className="flex items-baseline justify-between">
              <span className="font-bold">{ui.subtotal}</span>
              <span className="vt-h3">{unknown ? "—" : formatPrice(subtotal)}</span>
            </div>
            <p className="vt-muted text-sm">{ui.totalLater}</p>
            <Link href={links.order} className="vt-btn vt-btn--accent vt-btn--block" onClick={() => setOpen(false)}>
              {ui.checkout} <Icon name="arrow" className="vt-arrow size-5" />
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
