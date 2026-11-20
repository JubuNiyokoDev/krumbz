"use client";

import { useId, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { scrollToTarget } from "@/hooks/useUi";
import { formatPrice, orderSubtotal } from "@/lib/order/whatsapp";
import { useTranslations } from "next-intl";
import { useCart } from "@/store/cart";
import { PAYMENT_METHOD_IDS, PAYMENT_PROVIDERS, type PaymentMethodId } from "@/lib/order/payment";
import type { CustomerInfo, OrderDraft, OrderErrors } from "@/lib/order/types";
import { buildOrderMessage, validateOrder, whatsappUrl, type WhatsAppTemplate } from "@/lib/order/whatsapp";
import { PackIllustration } from "@/components/ui/PackIllustration";
import { Biscuit } from "@/components/ui/Biscuit";
import { TextWithToComplete } from "@/components/ui/ToComplete";
import { ArrowRightIcon, CheckIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { AddToCartButton } from "./AddToCartButton";
import { CartLineItem } from "./CartLineItem";
import { CartTotals } from "./CartTotals";
import { PriceTag } from "./PriceTag";
import { QuantityStepper } from "./QuantityStepper";
import { useCartLines } from "./useCartProducts";

type FieldName = keyof Pick<CustomerInfo, "name" | "phone" | "city" | "district">;
type Errors = OrderErrors & { payment?: true };

const EMPTY: CustomerInfo = { name: "", phone: "", city: "", district: "", notes: "" };
const FIELD_ORDER: FieldName[] = ["name", "phone", "city", "district"];

/**
 * Catalogue + persistent cart summary + customer form. On submit the order is
 * validated, passed to the selected payment provider (`initiate`), then turned
 * into a WhatsApp message opened in the same tab (no popup blocker on mobile).
 */
export function OrderExperience() {
  const t = useTranslations("order");
  const tw = useTranslations("order.whatsapp");
  const common = useTranslations("common");
  const contact = useTranslations("contact");
  const uid = useId();
  const { lines, products, hydrated } = useCartLines();
  const cartLines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const clear = useCart((s) => s.clear);

  const [customer, setCustomer] = useState<CustomerInfo>(EMPTY);
  const [payment, setPayment] = useState<PaymentMethodId>("cash");
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ url: string; instructions?: string } | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  const id = (name: string) => `${uid}-${name}`;
  const quantityOf = (productId: string) => cartLines.find((l) => l.id === productId)?.quantity ?? 0;
  const paymentLabels: Record<PaymentMethodId, string> = {
    cash: t("payment.cash"),
    lumicash: t("payment.lumicash"),
    ecocash: t("payment.ecocash"),
  };
  const errorMessages: Record<keyof Errors, string> = {
    name: t("form.errors.name"),
    phone: t("form.errors.phone"),
    city: t("form.errors.city"),
    district: t("form.errors.district"),
    cart: t("form.errors.cart"),
    payment: t("form.errors.payment"),
  };

  const computeErrors = (info: CustomerInfo, method: PaymentMethodId): Errors => {
    const result: Errors = validateOrder(info, lines);
    if (!PAYMENT_PROVIDERS[method].available) result.payment = true;
    return result;
  };

  const update = (name: keyof CustomerInfo, value: string) => {
    const next = { ...customer, [name]: value };
    setCustomer(next);
    // After a first submit, errors follow the input live.
    if (submitted) setErrors(computeErrors(next, payment));
  };

  const focusSummary = () => requestAnimationFrame(() => summaryRef.current?.focus());

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitted(true);
    const found = computeErrors(customer, payment);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusSummary();
      return;
    }
    setSubmitting(true);
    const draft: OrderDraft = { lines, customer, payment };
    const result = await PAYMENT_PROVIDERS[payment].initiate(draft);
    if (result.status === "failed") {
      setErrors({ payment: true });
      setSubmitting(false);
      focusSummary();
      return;
    }
    const template: WhatsAppTemplate = {
      greeting: tw("greeting"),
      line: (v) => tw("line", v),
      subtotal: (v) => tw("subtotal", v),
      customer: (v) => tw("customer", v),
      phone: (v) => tw("phone", v),
      address: (v) => tw("address", v),
      notes: (v) => tw("notes", v),
      payment: (v) => tw("payment", v),
      thanks: tw("thanks"),
    };
    const url = whatsappUrl(contact("whatsapp.number"), buildOrderMessage(draft, template, paymentLabels[payment]));
    setSuccess({ url, instructions: result.status === "pending" ? result.instructions : undefined });
    setSubmitting(false);
    requestAnimationFrame(() => successRef.current?.focus({ preventScroll: false }));
    window.location.assign(url);
  };

  const newOrder = () => {
    clear();
    setCustomer(EMPTY);
    setErrors({});
    setSubmitted(false);
    setSuccess(null);
  };

  // Guided flow: 1 choose biscuits → 2 fill details → 3 send on WhatsApp.
  const hasItems = hydrated && lines.length > 0;
  const firstEmpty = FIELD_ORDER.find((name) => !customer[name].trim());
  const step: 1 | 2 | 3 = !hasItems ? 1 : firstEmpty ? 2 : 3;
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = orderSubtotal(lines);

  const headerOffset = () => -(document.querySelector("header")?.getBoundingClientRect().height ?? 80) - 16;
  const goToStep = (target: 1 | 2 | 3) => {
    const element = document.getElementById(`etape-${target}`);
    if (!element) return;
    scrollToTarget(element, headerOffset());
    if (target === 2 && firstEmpty) {
      // Put the cursor in the first empty field once the scroll has settled.
      window.setTimeout(() => document.getElementById(id(firstEmpty))?.focus({ preventScroll: true }), 650);
    } else {
      element.focus({ preventScroll: true });
    }
  };
  const nextAction = () => {
    if (step === 1) goToStep(1);
    else if (step === 2) goToStep(2);
    else formRef.current?.requestSubmit();
  };
  const nextLabel = step === 1 ? t("next.toProducts") : step === 2 ? t("next.toDetails") : t("next.send");
  const nextShort = step === 1 ? t("next.toProductsShort") : step === 2 ? t("next.toDetailsShort") : t("next.sendShort");
  const stepNames = [t("steps.products"), t("steps.details"), t("steps.send")];

  const errorKeys = (Object.keys(errors) as (keyof Errors)[]).filter((k) => errors[k]);
  const fieldError = (name: FieldName) => (errors[name] ? errorMessages[name] : undefined);

  return (
    <div className="mx-auto grid max-w-[88rem] gap-10 px-4 pb-28 sm:px-6 lg:grid-cols-[1.3fr_0.7fr] lg:gap-14 lg:px-10 lg:pb-0">
      {/* Steps */}
      {!success ? (
        <nav aria-label={t("steps.label")} className="lg:col-span-2">
          <ol className="grid grid-cols-3 gap-2 sm:gap-4">
            {stepNames.map((name, i) => {
              const n = (i + 1) as 1 | 2 | 3;
              const state = n < step ? "done" : n === step ? "current" : "todo";
              return (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => goToStep(n)}
                    aria-current={state === "current" ? "step" : undefined}
                    className={`group flex w-full flex-col items-start gap-2 rounded-2xl border-2 p-3 text-left transition-colors duration-300 sm:flex-row sm:items-center sm:gap-3 sm:p-4 ${
                      state === "current" ? "border-navy bg-navy text-cream shadow-lift" : state === "done" ? "border-gold bg-gold/20 text-navy" : "border-navy/15 bg-cream text-navy/70 hover:border-navy/40"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-lg font-bold ${
                        state === "current" ? "bg-gold text-navy" : state === "done" ? "bg-gold text-navy" : "bg-navy/10 text-navy"
                      }`}
                    >
                      {state === "done" ? <CheckIcon size={18} /> : n}
                    </span>
                    <span className="min-w-0">
                      <span className={`hidden text-xs font-semibold uppercase tracking-wider sm:block ${state === "current" ? "text-gold-light" : "text-navy/60"}`}>
                        {t("steps.stepOf", { n })}
                      </span>
                      <span className="block font-display text-sm font-bold leading-tight sm:text-lg">{name}</span>
                      <span className="sr-only">{state === "done" ? ` — ${t("steps.done")}` : state === "current" ? ` — ${t("steps.current")}` : ""}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      {/* Step 1 — Catalogue */}
      <section id="etape-1" aria-labelledby={id("catalog")} tabIndex={-1} className="scroll-mt-28 outline-none lg:col-start-1">
        <span id="catalogue" aria-hidden />
        <h2 id={id("catalog")} className="flex items-center gap-3 font-display text-3xl font-bold sm:text-4xl">
          <StepBadge n={1} />
          {stepNames[0]}
        </h2>
        <ul className="mt-6 grid gap-5 sm:grid-cols-2">
          {products.map((product) => {
            const quantity = hydrated ? quantityOf(product.id) : 0;
            return (
              <li key={product.id} className="group flex flex-col gap-4 rounded-[2rem] bg-cream-deep/60 p-5 ring-1 ring-navy/10 transition-shadow duration-500 hover:shadow-lift sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-cream">
                    <PackIllustration model={product.model} brand="Krumbz" tagline="" className="h-20 w-20 transition-transform duration-700 ease-out-back group-hover:-rotate-6 group-hover:scale-110" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-2xl font-bold leading-tight">{product.name}</h3>
                    <p className="text-navy/75">{product.short}</p>
                    <p className="mt-1 text-sm font-semibold">
                      <PriceTag product={product} />
                    </p>
                  </div>
                </div>
                <div className="mt-auto">
                  {quantity > 0 ? (
                    <QuantityStepper value={quantity} onChange={(q) => setQuantity(product.id, q)} productName={product.name} />
                  ) : (
                    <AddToCartButton productId={product.id} productName={product.name} variant="gold" className="w-full" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Cart summary (sticky on desktop) */}
      <aside aria-labelledby={id("cart")} className="lg:col-start-2 lg:row-span-2 lg:row-start-2">
        <div className="rounded-[2rem] bg-navy p-6 text-cream shadow-lift lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 id={id("cart")} className="font-display text-2xl font-bold">
              {t("cartTitle")}
            </h2>
            {hydrated && lines.length > 0 ? (
              <button type="button" onClick={clear} className="rounded-full px-3 py-2 text-sm font-semibold text-cream/80 underline-offset-4 hover:text-cream hover:underline">
                {t("clearCart")}
              </button>
            ) : null}
          </div>
          {!hydrated ? (
            <p className="flex items-center gap-3 py-8 text-cream/80" role="status">
              <span className="flex gap-1.5" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="loading-crumb h-2.5 w-2.5 rounded-full bg-gold" style={{ "--i": i } as CSSProperties} />
                ))}
              </span>
              {t("summaryLoading")}
            </p>
          ) : lines.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Biscuit className="h-20 w-20 animate-crumb-float" />
              <p className="font-display text-xl font-semibold">{t("cartEmpty")}</p>
              <p className="text-cream/80">{t("cartEmptyCta")}</p>
            </div>
          ) : (
            <>
              <ul className="mt-2 divide-y divide-cream/15">
                {lines.map((line) => {
                  const product = products.find((p) => p.id === line.id);
                  return product ? <CartLineItem key={line.id} product={product} quantity={line.quantity} tone="dark" /> : null;
                })}
              </ul>
              <div className="mt-2 border-t border-cream/15 pt-4">
                <CartTotals lines={lines} tone="dark" />
              </div>
              {!success ? (
                <button type="button" onClick={nextAction} className={`btn mt-5 hidden w-full lg:inline-flex ${step === 3 ? "btn-whatsapp" : "btn-gold"}`}>
                  {step === 3 ? <WhatsAppIcon size={20} /> : null}
                  {nextLabel}
                  <ArrowRightIcon size={20} className="btn-icon btn-icon-arrow" />
                </button>
              ) : null}
            </>
          )}
          <div className="mt-5 rounded-2xl bg-cream/10 p-4 text-sm text-cream/85">
            <p className="font-display text-base font-semibold text-gold-light">{t("delivery.title")}</p>
            <p className="mt-1">
              <TextWithToComplete value={t("delivery.text")} label={common("toComplete")} hint={common("toCompleteHint")} tone="dark" />
            </p>
          </div>
        </div>
      </aside>

      {/* Form or success */}
      <section id="etape-2" aria-labelledby={id("form")} tabIndex={-1} className="scroll-mt-28 outline-none lg:col-start-1">
        {success ? (
          <div className="flex flex-col items-start gap-5 rounded-[2rem] bg-cream-deep/70 p-6 ring-1 ring-navy/10 sm:p-10" role="status">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[#0e7a40] text-white">
              <CheckIcon size={34} />
            </span>
            <h2 id={id("form")} ref={successRef} tabIndex={-1} className="font-display text-3xl font-bold outline-none sm:text-4xl">
              {t("success.title")}
            </h2>
            <p className="text-lg text-navy/85">{t("success.text")}</p>
            {success.instructions ? <p className="text-lg">{success.instructions}</p> : null}
            <div className="flex flex-wrap gap-3">
              <a href={success.url} className="btn btn-whatsapp">
                <WhatsAppIcon size={22} />
                {t("success.retry")}
              </a>
              <button type="button" onClick={newOrder} className="btn btn-ghost text-navy">
                {t("success.newOrder")}
              </button>
            </div>
          </div>
        ) : (
          <form ref={formRef} noValidate onSubmit={onSubmit} className="rounded-[2rem] bg-cream-deep/50 p-6 ring-1 ring-navy/10 sm:p-8 lg:p-10">
            <h2 id={id("form")} className="flex items-center gap-3 font-display text-3xl font-bold sm:text-4xl">
              <StepBadge n={2} />
              {stepNames[1]}
            </h2>

            {submitted && errorKeys.length > 0 ? (
              <div ref={summaryRef} tabIndex={-1} role="alert" className="mt-6 rounded-2xl border-2 border-rust bg-cream p-5 outline-none focus-visible:ring-4 focus-visible:ring-rust-bright/40">
                <p className="font-display text-lg font-bold text-rust">{t("form.errors.summary", { count: errorKeys.length })}</p>
                <p className="mt-1 text-sm text-navy/80">{t("form.errorsTitle")}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {errorKeys.map((key) => (
                    <li key={key}>
                      <a
                        href={`#${key === "cart" ? "catalogue" : key === "payment" ? id("payment-cash") : id(key)}`}
                        className="font-semibold text-rust underline underline-offset-4"
                      >
                        {errorMessages[key]}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {FIELD_ORDER.map((name) => (
                <Field
                  key={name}
                  id={id(name)}
                  label={t(`form.${name}`)}
                  required={t("form.required")}
                  help={name === "phone" ? t("form.phoneHelp") : undefined}
                  error={fieldError(name)}
                  prefix={name === "phone" ? "+257" : undefined}
                >
                  {(props) => (
                    <input
                      {...props}
                      type={name === "phone" ? "tel" : "text"}
                      inputMode={name === "phone" ? "tel" : undefined}
                      autoComplete={{ name: "name", phone: "tel-national", city: "address-level2", district: "address-level3" }[name]}
                      placeholder={t(`form.${name}Placeholder`)}
                      value={customer[name]}
                      onChange={(e) => update(name, e.target.value)}
                      onBlur={() => submitted && setErrors(computeErrors(customer, payment))}
                      required
                    />
                  )}
                </Field>
              ))}
              <div className="sm:col-span-2">
                <Field id={id("notes")} label={t("form.notes")}>
                  {(props) => (
                    <textarea
                      {...props}
                      rows={3}
                      placeholder={t("form.notesPlaceholder")}
                      value={customer.notes}
                      onChange={(e) => update("notes", e.target.value)}
                    />
                  )}
                </Field>
              </div>
            </div>

            <fieldset id="etape-3" tabIndex={-1} className="mt-10 scroll-mt-28 outline-none" aria-describedby={errors.payment ? id("payment-error") : undefined}>
              <legend className="flex items-center gap-3 font-display text-2xl font-bold">
                <StepBadge n={3} small />
                {stepNames[2]} · {t("payment.title")}
              </legend>
              <p className="sr-only">{t("payment.methodLabel")}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {PAYMENT_METHOD_IDS.map((method) => {
                  const available = PAYMENT_PROVIDERS[method].available;
                  const checked = payment === method;
                  return (
                    <label
                      key={method}
                      className={`relative flex cursor-pointer flex-col gap-1 rounded-2xl border-2 bg-cream p-4 transition-all duration-300 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-rust-bright/40 ${
                        checked ? "border-navy shadow-biscuit" : "border-navy/15 hover:border-navy/40"
                      } ${available ? "" : "cursor-not-allowed opacity-70"}`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="payment"
                          id={id(`payment-${method}`)}
                          value={method}
                          checked={checked}
                          disabled={!available}
                          onChange={() => setPayment(method)}
                          aria-describedby={id(`payment-${method}-help`)}
                          className="h-5 w-5 accent-navy"
                        />
                        <span className="font-display text-lg font-semibold">{paymentLabels[method]}</span>
                      </span>
                      <span id={id(`payment-${method}-help`)} className="text-sm text-navy/75">
                        {available ? (
                          t("payment.cashHelp")
                        ) : (
                          <span className="tc-badge text-rust">{t("payment.soon")}</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
              {errors.payment ? (
                <p id={id("payment-error")} className="mt-3 font-semibold text-rust">
                  {errorMessages.payment}
                </p>
              ) : null}
            </fieldset>

            <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <button type="submit" className="btn btn-whatsapp px-7 py-4 text-lg" disabled={submitting} aria-busy={submitting}>
                <WhatsAppIcon size={22} />
                {submitting ? t("form.submitting") : t("form.submit")}
                <ArrowRightIcon size={20} className="btn-icon btn-icon-arrow" />
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Mobile: always-visible summary + next action */}
      {!success ? (
        <div data-order-bar role="region" aria-label={t("barLabel")} className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-cream/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_-18px_rgb(18_38_74/0.45)] backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-navy/65">
                {t("steps.stepOf", { n: step })} · {t("itemsCount", { count: hasItems ? itemCount : 0 })}
              </p>
              <p className="truncate font-display text-lg font-bold tabular-nums">
                {hasItems && subtotal !== null ? formatPrice(subtotal) : stepNames[step - 1]}
              </p>
            </div>
            <button type="button" onClick={nextAction} disabled={submitting} className={`btn shrink-0 px-5 py-3 ${step === 3 ? "btn-whatsapp" : "btn-primary"}`}>
              {step === 3 ? <WhatsAppIcon size={20} /> : null}
              <span aria-hidden>{nextShort}</span>
              <span className="sr-only">{nextLabel}</span>
              <ArrowRightIcon size={18} className="btn-icon btn-icon-arrow" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StepBadge({ n, small = false }: { n: number; small?: boolean }) {
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full bg-gold font-display font-bold text-navy shadow-biscuit ${small ? "h-9 w-9 text-lg" : "h-11 w-11 text-xl sm:h-12 sm:w-12"}`}>
      {n}
    </span>
  );
}

type ControlProps = {
  id: string;
  name: string;
  "aria-invalid"?: "true";
  "aria-describedby"?: string;
  className: string;
};

/** Label + control + help + error, wired with aria-invalid / aria-describedby. */
function Field({
  id,
  label,
  required,
  help,
  error,
  prefix,
  children,
}: {
  id: string;
  label: string;
  required?: string;
  help?: string;
  error?: string;
  prefix?: string;
  children: (props: ControlProps) => ReactNode;
}) {
  const describedBy = [help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  const base = `w-full rounded-2xl border-2 bg-cream px-4 py-3.5 text-lg text-navy outline-none transition-colors placeholder:text-navy/60 focus:border-navy ${
    error ? "border-rust" : "border-navy/15 hover:border-navy/35"
  } ${prefix ? "pl-[4.6rem]" : ""}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-display text-lg font-semibold">
        {label}
        {required ? <span className="ml-2 text-sm font-semibold text-rust">({required})</span> : null}
      </label>
      <div className="relative">
        {prefix ? (
          <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-display text-lg font-semibold text-navy/70">
            {prefix}
          </span>
        ) : null}
        {children({
          id,
          name: id.split("-").pop() ?? id,
          className: base,
          ...(error ? { "aria-invalid": "true" as const } : {}),
          "aria-describedby": describedBy,
        })}
      </div>
      {help ? (
        <p id={`${id}-help`} className="text-sm text-navy/75">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-sm font-semibold text-rust">
          <span aria-hidden>●</span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
