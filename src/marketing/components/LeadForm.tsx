"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { whatsappUrl } from "../format";

export interface LeadFormText {
  optional: string;
  name: { label: string; placeholder: string };
  business: { label: string; placeholder: string; options: string[] };
  city: { label: string; placeholder: string };
  phone: { label: string; placeholder: string; hint: string };
  message: { label: string; placeholder: string };
  submit: string;
  privacy: string;
  errors: { required: string; phone: string };
  sent: { title: string; text: string; retry: string; edit: string };
  whatsapp: { greeting: string; name: string; business: string; city: string; phone: string; message: string };
}

type Field = "name" | "business" | "city" | "phone" | "message";
type Values = Record<Field, string>;
const EMPTY: Values = { name: "", business: "", city: "", phone: "", message: "" };
const REQUIRED: Field[] = ["name", "business", "city", "phone"];

/**
 * Burundi number: 8 digits, optionally preceded by +257 / 00257 / 257.
 * Spaces, dots, dashes and parentheses are accepted. Returns "+257 XX XX XX XX" or null.
 */
export function normalizeBurundiPhone(input: string): string | null {
  const compact = input.trim().replace(/[\s.\-()]/g, "");
  const match = /^(?:(?:\+|00)?257)?(\d{8})$/.exec(compact);
  if (!match) return null;
  return `+257 ${match[1].replace(/(\d{2})(?=\d)/g, "$1 ")}`;
}

function buildMessage(t: LeadFormText["whatsapp"], v: Values) {
  const lines = [
    t.greeting,
    "",
    `${t.name}: ${v.name.trim()}`,
    `${t.business}: ${v.business}`,
    `${t.city}: ${v.city.trim()}`,
    `${t.phone}: ${normalizeBurundiPhone(v.phone) ?? v.phone.trim()}`,
  ];
  if (v.message.trim()) lines.push("", `${t.message}: ${v.message.trim()}`);
  return lines.join("\n");
}

/**
 * « Je veux ma vitrine »: builds a WhatsApp message and opens wa.me.
 * Nothing is sent to or stored by the site.
 */
export function LeadForm({ text: t, whatsappNumber }: { text: LeadFormText; whatsappNumber: string }) {
  const uid = useId();
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [sentUrl, setSentUrl] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const id = (f: Field) => `${uid}-${f}`;
  const set = (f: Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setValues((prev) => ({ ...prev, [f]: value }));
    if (errors[f]) setErrors((prev) => ({ ...prev, [f]: undefined }));
  };

  const validate = (v: Values) => {
    const next: Partial<Record<Field, string>> = {};
    for (const f of REQUIRED) if (!v[f].trim()) next[f] = t.errors.required;
    if (!next.phone && !normalizeBurundiPhone(v.phone)) next.phone = t.errors.phone;
    return next;
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    const first = (Object.keys(found) as Field[])[0];
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`#${CSS.escape(id(first))}`)?.focus();
      return;
    }
    const url = whatsappUrl(whatsappNumber, buildMessage(t.whatsapp, values));
    window.open(url, "_blank", "noopener,noreferrer");
    setSentUrl(url);
    requestAnimationFrame(() => statusRef.current?.focus());
  };

  if (sentUrl) {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="flex min-h-[26rem] flex-col items-start justify-center outline-none">
        <span className="rn-ping grid h-14 w-14 place-items-center rounded-full bg-rn-wa text-rn-ink">
          <WhatsAppIcon size={28} />
        </span>
        <p className="mt-7 font-rn-display text-[1.9rem] font-bold leading-tight">{t.sent.title}</p>
        <p className="mt-3 text-rn-muted">{t.sent.text}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={sentUrl} target="_blank" rel="noopener noreferrer" className="rn-btn rn-btn-wa">
            <WhatsAppIcon size={20} />
            {t.sent.retry}
          </a>
          <button type="button" onClick={() => setSentUrl(null)} className="rn-btn rn-btn-ghost text-rn-cream">
            {t.sent.edit}
          </button>
        </div>
      </div>
    );
  }

  const label = (f: Field, text: string, optional = false) => (
    <label htmlFor={id(f)} className="mb-2 block text-sm font-semibold text-rn-cream">
      {text}
      {optional ? <span className="ml-1.5 font-normal text-rn-muted">({t.optional})</span> : null}
    </label>
  );
  const error = (f: Field) =>
    errors[f] ? (
      <p id={`${id(f)}-error`} className="mt-1.5 text-sm text-[#ff8a6b]">
        {errors[f]}
      </p>
    ) : null;
  const aria = (f: Field) => ({
    "aria-invalid": errors[f] ? true : undefined,
    "aria-describedby": errors[f] ? `${id(f)}-error` : f === "phone" ? `${id(f)}-hint` : undefined,
  });

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        {label("name", t.name.label)}
        <input id={id("name")} name="name" autoComplete="name" required value={values.name} onChange={set("name")} placeholder={t.name.placeholder} className="rn-field" {...aria("name")} />
        {error("name")}
      </div>
      <div>
        {label("business", t.business.label)}
        <select id={id("business")} name="business" required value={values.business} onChange={set("business")} className="rn-field" {...aria("business")}>
          <option value="" disabled>
            {t.business.placeholder}
          </option>
          {t.business.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {error("business")}
      </div>
      <div>
        {label("city", t.city.label)}
        <input id={id("city")} name="city" autoComplete="address-level2" required value={values.city} onChange={set("city")} placeholder={t.city.placeholder} className="rn-field" {...aria("city")} />
        {error("city")}
      </div>
      <div className="sm:col-span-2">
        {label("phone", t.phone.label)}
        <input id={id("phone")} name="phone" type="tel" inputMode="tel" autoComplete="tel" required value={values.phone} onChange={set("phone")} placeholder={t.phone.placeholder} className="rn-field" {...aria("phone")} />
        {errors.phone ? (
          error("phone")
        ) : (
          <p id={`${id("phone")}-hint`} className="mt-1.5 text-sm text-rn-muted">
            {t.phone.hint}
          </p>
        )}
      </div>
      <div className="sm:col-span-2">
        {label("message", t.message.label, true)}
        <textarea id={id("message")} name="message" rows={4} value={values.message} onChange={set("message")} placeholder={t.message.placeholder} className="rn-field resize-y" />
      </div>
      <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <button type="submit" className="rn-btn rn-btn-wa w-full sm:w-auto">
          <WhatsAppIcon size={20} />
          {t.submit}
        </button>
        <p className="flex items-start gap-2 text-sm leading-snug text-rn-muted sm:max-w-[18rem]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden>
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          {t.privacy}
        </p>
      </div>
    </form>
  );
}
