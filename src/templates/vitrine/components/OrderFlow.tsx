"use client";

import Link from "next/link";
import { useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { PAYMENT_PROVIDERS } from "@/lib/order/payment";
import type { CustomerInfo, OrderDraft, OrderErrors, OrderLine } from "@/lib/order/types";
import { buildOrderMessage, formatPrice, orderSubtotal, validateOrder, whatsappUrl, type WhatsAppTemplate } from "@/lib/order/whatsapp";
import { useCart, useVitrine } from "../lib/context";
import { fill } from "../lib/i18n";
import { useVitrineUi } from "../lib/ui";
import { Icon, Img, WhatsAppIcon } from "./primitives";
import { Stepper } from "./Stepper";

const EMPTY: CustomerInfo = { name: "", phone: "", city: "", district: "", notes: "" };
const FIELD_ORDER = ["name", "phone", "city", "district"] as const;

/**
 * Guided order: 1 cart → 2 details → 3 send. The message (lines, quantities,
 * prices, total, customer) is built with the shared Krumbz order logic
 * (src/lib/order) and opened in WhatsApp for the shop's number. Nothing is
 * stored on a server; the cart lives in this device's localStorage only.
 */
export function OrderFlow() {
  const { ui, catalog, whatsapp, shopName, links } = useVitrine();
  const store = useCart();
  const cartLines = store((s) => s.lines);
  const hydrated = store((s) => s.hydrated);
  const setQuantity = store((s) => s.setQuantity);
  const add = store((s) => s.add);
  const clear = store((s) => s.clear);
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  const [customer, setCustomer] = useState<CustomerInfo>(EMPTY);
  const [errors, setErrors] = useState<OrderErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [sentUrl, setSentUrl] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const items = useMemo(
    () =>
      cartLines
        .map((line) => ({ line, product: catalog.find((p) => p.id === line.id) }))
        .filter((x): x is { line: typeof x.line; product: NonNullable<typeof x.product> } => Boolean(x.product) && x.line.quantity > 0),
    [cartLines, catalog],
  );
  const label = (name: string, option: string | null) => (option ? `${name} (${option})` : name);
  const orderLines: OrderLine[] = items.map(({ line, product }) => ({
    id: `${line.id}:${line.option ?? ""}`,
    name: label(product.name, line.option),
    quantity: line.quantity,
    unitPrice: product.price,
  }));
  const subtotal = orderSubtotal(orderLines);
  const itemCount = items.reduce((sum, x) => sum + x.line.quantity, 0);
  const hasItems = hydrated && items.length > 0;
  const firstEmpty = FIELD_ORDER.find((name) => !customer[name].trim());
  const step: 1 | 2 | 3 = !hasItems ? 1 : firstEmpty ? 2 : 3;
  const others = catalog.filter((p) => !items.some((x) => x.product.id === p.id));

  const template: WhatsAppTemplate = {
    greeting: fill(ui.waGreeting, { shop: shopName }),
    line: ({ quantity, name }) => {
      const l = orderLines.find((o) => o.name === name);
      return l?.unitPrice != null
        ? fill(ui.waLine, { quantity, name, amount: formatPrice(l.unitPrice * quantity) })
        : fill(ui.waLineNoPrice, { quantity, name });
    },
    subtotal: ({ amount }) => fill(ui.waTotal, { amount }),
    customer: ({ name }) => fill(ui.waCustomer, { name }),
    phone: ({ phone }) => fill(ui.waPhone, { phone }),
    address: ({ district, city }) => fill(ui.waAddress, { district, city }),
    notes: ({ notes }) => fill(ui.waNotes, { notes }),
    payment: ({ method }) => fill(ui.waPayment, { method }),
    thanks: ui.waThanks,
  };
  const draft: OrderDraft = { lines: orderLines, customer, payment: "cash" };
  const message = buildOrderMessage(draft, template, ui.waCash);

  const errorText: Record<keyof OrderErrors, string> = {
    name: ui.errName,
    phone: ui.errPhone,
    city: ui.errCity,
    district: ui.errDistrict,
    cart: ui.errCart,
  };

  const update = (name: keyof CustomerInfo, value: string) => {
    const next = { ...customer, [name]: value };
    setCustomer(next);
    if (submitted) setErrors(validateOrder(next, orderLines));
  };

  const scrollTo = (el: HTMLElement | null) => {
    if (!el) return;
    const offset = (document.querySelector(".vt-header")?.getBoundingClientRect().height ?? 72) + 16;
    const lenis = useVitrineUi.getState().lenis;
    if (lenis) lenis.scrollTo(el, { offset: -offset });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
  };

  const goToStep = (target: 1 | 2 | 3) => {
    const el = document.getElementById(id(`step-${target}`));
    scrollTo(el);
    if (target === 2 && firstEmpty) window.setTimeout(() => document.getElementById(id(firstEmpty))?.focus({ preventScroll: true }), 600);
    else el?.focus({ preventScroll: true });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    const found = validateOrder(customer, orderLines);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() => {
        summaryRef.current?.focus({ preventScroll: true });
        scrollTo(summaryRef.current);
      });
      return;
    }
    await PAYMENT_PROVIDERS.cash.initiate(draft);
    const url = whatsappUrl(whatsapp, message);
    setSentUrl(url);
    requestAnimationFrame(() => successRef.current?.focus());
    window.location.assign(url);
  };

  const newOrder = () => {
    clear();
    setCustomer(EMPTY);
    setErrors({});
    setSubmitted(false);
    setSentUrl(null);
  };

  const errorKeys = (Object.keys(errors) as (keyof OrderErrors)[]).filter((k) => errors[k]);
  const stepNames = [ui.stepCart, ui.stepDetails, ui.stepSend];

  if (sentUrl) {
    return (
      <div ref={successRef} tabIndex={-1} className="vt-panel grid max-w-2xl gap-5 p-8 outline-none" role="status">
        <span className="vt-promise__icon !size-14" aria-hidden>
          <Icon name="check" className="size-7" />
        </span>
        <h2 className="vt-h2 !text-[clamp(1.8rem,4vw,2.8rem)]">{ui.sentTitle}</h2>
        <p className="vt-muted">{ui.sentText}</p>
        <div className="flex flex-wrap gap-3">
          <a href={sentUrl} className="vt-btn vt-btn--wa" data-testid="vt-wa-link">
            <WhatsAppIcon /> {ui.openWhatsApp}
          </a>
          <button type="button" className="vt-btn vt-btn--ghost" onClick={newOrder}>
            {ui.newOrder}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-10 pb-24 lg:grid-cols-[1.25fr_0.75fr] lg:pb-0">
      <nav aria-label={ui.stepsLabel} className="lg:col-span-2">
        <ol className="vt-steps">
          {stepNames.map((name, i) => {
            const n = (i + 1) as 1 | 2 | 3;
            const state = n < step ? "done" : n === step ? "current" : "todo";
            return (
              <li key={name}>
                <button type="button" onClick={() => goToStep(n)} data-state={state} aria-current={state === "current" ? "step" : undefined}>
                  <span className="vt-steps__dot" aria-hidden>
                    {state === "done" ? <Icon name="check" className="size-4" /> : n}
                  </span>
                  <span className="grid text-left leading-tight">
                    <span className="text-[0.7rem] font-bold uppercase tracking-[0.12em] opacity-70">{fill(ui.stepOf, { n })}</span>
                    <span className="font-bold">{name}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="grid content-start gap-8">
        {/* 1 — Cart */}
        <section id={id("step-1")} tabIndex={-1} className="vt-panel grid gap-5 p-5 outline-none sm:p-7" aria-labelledby={id("h1")}>
          <h2 id={id("h1")} className="vt-h3 flex items-center gap-3">
            <span className="vt-steps__dot" aria-hidden>1</span> {ui.stepCart}
          </h2>
          {!hydrated ? (
            <div className="h-24 animate-pulse rounded-2xl" style={{ background: "var(--vt-soft)" }} />
          ) : items.length === 0 ? (
            <div className="grid justify-items-start gap-3">
              <p className="vt-muted">{ui.orderEmpty}</p>
              <Link href={links.products} className="vt-btn vt-btn--sm">
                {ui.toProducts} <Icon name="arrow" className="vt-arrow size-4" />
              </Link>
            </div>
          ) : (
            <ul className="grid gap-4" data-testid="vt-order-lines">
              {items.map(({ line, product }) => (
                <li key={`${line.id}:${line.option ?? ""}`} className="flex items-center gap-4">
                  <Link href={product.href} className="size-20 shrink-0 overflow-hidden rounded-[min(var(--vt-radius-control),1rem)]" style={{ background: "var(--vt-bg)" }}>
                    {product.image && <Img src={product.image.url} alt={product.image.alt} className="size-full object-contain" />}
                  </Link>
                  <div className="grid min-w-0 flex-1 gap-1.5">
                    <p className="truncate font-bold">{product.name}</p>
                    {line.option && <p className="vt-muted text-sm capitalize">{line.option}</p>}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Stepper small value={line.quantity} onChange={(q) => setQuantity(line.id, line.option, q)} label={product.name} allowZero />
                      <span className="font-bold">{product.price !== null ? formatPrice(product.price * line.quantity) : ui.priceOnRequest}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {hydrated && others.length > 0 && (
            <div className="grid gap-2.5 border-t pt-5" style={{ borderColor: "var(--vt-line)" }}>
              <span className="text-sm font-bold">{items.length > 0 ? ui.related : ui.products}</span>
              <ul className="flex flex-wrap gap-2">
                {others.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="vt-chip cursor-pointer" onClick={() => add(p.id, 1)} aria-label={`${ui.addToCart} — ${p.name}`}>
                      <Icon name="cart" className="size-4" /> {p.name}
                      {p.price !== null && <span className="vt-muted font-semibold">· {formatPrice(p.price)}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* 2 — Details */}
        <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-8">
          <section id={id("step-2")} tabIndex={-1} className="vt-panel grid gap-5 p-5 outline-none sm:p-7" aria-labelledby={id("h2")}>
            <h2 id={id("h2")} className="vt-h3 flex items-center gap-3">
              <span className="vt-steps__dot" aria-hidden>2</span> {ui.yourDetails}
            </h2>
            {errorKeys.length > 0 && (
              <div ref={summaryRef} tabIndex={-1} role="alert" className="vt-alert outline-none">
                <p className="font-bold">{ui.fixErrors}</p>
                <ul className="mt-1 list-disc pl-5">
                  {errorKeys.map((k) => (
                    <li key={k}>
                      {k === "cart" ? errorText[k] : <a href={`#${id(k)}`}>{errorText[k]}</a>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={id("name")} label={ui.name} required={ui.required} error={errors.name ? errorText.name : undefined} className="sm:col-span-2">
                <input id={id("name")} name="name" autoComplete="name" value={customer.name} placeholder={ui.namePh} onChange={(e) => update("name", e.target.value)} aria-invalid={errors.name || undefined} aria-describedby={errors.name ? id("name-err") : undefined} />
              </Field>
              <Field id={id("phone")} label={ui.phone} required={ui.required} help={ui.phoneHelp} error={errors.phone ? errorText.phone : undefined} className="sm:col-span-2">
                <input id={id("phone")} name="phone" type="tel" inputMode="tel" autoComplete="tel" value={customer.phone} placeholder={ui.phonePh} onChange={(e) => update("phone", e.target.value)} aria-invalid={errors.phone || undefined} aria-describedby={`${id("phone-help")}${errors.phone ? ` ${id("phone-err")}` : ""}`} />
              </Field>
              <Field id={id("city")} label={ui.city} required={ui.required} error={errors.city ? errorText.city : undefined}>
                <input id={id("city")} name="city" autoComplete="address-level2" value={customer.city} placeholder={ui.cityPh} onChange={(e) => update("city", e.target.value)} aria-invalid={errors.city || undefined} aria-describedby={errors.city ? id("city-err") : undefined} />
              </Field>
              <Field id={id("district")} label={ui.district} required={ui.required} error={errors.district ? errorText.district : undefined}>
                <input id={id("district")} name="district" autoComplete="address-level3" value={customer.district} placeholder={ui.districtPh} onChange={(e) => update("district", e.target.value)} aria-invalid={errors.district || undefined} aria-describedby={errors.district ? id("district-err") : undefined} />
              </Field>
              <Field id={id("notes")} label={ui.notes} className="sm:col-span-2">
                <textarea id={id("notes")} name="notes" rows={3} value={customer.notes} placeholder={ui.notesPh} onChange={(e) => update("notes", e.target.value)} />
              </Field>
            </div>
          </section>

          {/* 3 — Send */}
          <section id={id("step-3")} tabIndex={-1} className="vt-panel grid gap-5 p-5 outline-none sm:p-7 lg:hidden" aria-labelledby={id("h3")}>
            <h2 id={id("h3")} className="vt-h3 flex items-center gap-3">
              <span className="vt-steps__dot" aria-hidden>3</span> {ui.stepSend}
            </h2>
            <SendBox ui={ui} itemCount={itemCount} subtotal={subtotal} hasItems={hasItems} message={message} />
          </section>
        </form>
      </div>

      <aside className="hidden content-start lg:grid">
        <div className="vt-panel sticky top-[calc(var(--vt-header-h)+1rem)] grid gap-5 p-7">
          <h2 className="vt-h3 flex items-center gap-3">
            <span className="vt-steps__dot" aria-hidden>3</span> {ui.stepSend}
          </h2>
          <SendBox ui={ui} itemCount={itemCount} subtotal={subtotal} hasItems={hasItems} message={message} onSend={() => formRef.current?.requestSubmit()} />
        </div>
      </aside>

      {/* Mobile action bar */}
      <div className="vt-orderbar lg:hidden">
        <div className="grid leading-tight">
          <span className="text-xs font-bold uppercase tracking-[0.1em] opacity-70">{fill(ui.stepOf, { n: step })} · {fill(ui.itemsCount, { count: hasItems ? itemCount : 0 })}</span>
          <span className="font-extrabold">{hasItems && subtotal !== null ? formatPrice(subtotal) : stepNames[step - 1]}</span>
        </div>
        <button
          type="button"
          className={`vt-btn vt-btn--sm ${step === 3 ? "vt-btn--wa" : ""}`}
          onClick={() => (step === 3 ? formRef.current?.requestSubmit() : goToStep(step))}
        >
          {step === 3 && <WhatsAppIcon />}
          {step === 1 ? ui.toProducts : step === 2 ? ui.toDetails : ui.send}
        </button>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  required,
  help,
  error,
  className = "",
  children,
}: {
  id: string;
  label: string;
  required?: string;
  help?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`vt-field ${className}`}>
      <label htmlFor={id}>
        {label} {required && <span className="vt-muted text-xs font-semibold">({required})</span>}
      </label>
      {children}
      {help && (
        <span id={`${id}-help`} className="vt-muted text-xs">
          {help}
        </span>
      )}
      {error && (
        <span id={`${id}-err`} className="vt-error">
          {error}
        </span>
      )}
    </div>
  );
}

function SendBox({
  ui,
  itemCount,
  subtotal,
  hasItems,
  message,
  onSend,
}: {
  ui: ReturnType<typeof useVitrine>["ui"];
  itemCount: number;
  subtotal: number | null;
  hasItems: boolean;
  message: string;
  onSend?: () => void;
}) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-bold">
          {ui.total} <span className="vt-muted text-sm font-semibold">· {fill(ui.itemsCount, { count: hasItems ? itemCount : 0 })}</span>
        </span>
        <span className="vt-h3" data-testid="vt-order-total">
          {hasItems ? (subtotal !== null ? formatPrice(subtotal) : "—") : formatPrice(0)}
        </span>
      </div>
      <p className="vt-muted text-sm">{ui.totalLater}</p>
      {hasItems && (
        <details className="vt-preview">
          <summary>{ui.preview}</summary>
          <pre>{message}</pre>
        </details>
      )}
      <p className="text-sm">{ui.payment}</p>
      <button type={onSend ? "button" : "submit"} onClick={onSend} className="vt-btn vt-btn--wa vt-btn--block">
        <WhatsAppIcon /> {ui.send}
      </button>
      <p className="vt-muted text-xs">{ui.noAccount}</p>
    </>
  );
}
