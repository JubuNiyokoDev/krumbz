import { normalizeBurundiPhone, formatBurundiPhone } from "./phone";
import type { CustomerInfo, OrderDraft, OrderErrors, OrderLine } from "./types";

export function validateOrder(customer: CustomerInfo, lines: OrderLine[]): OrderErrors {
  const errors: OrderErrors = {};
  if (customer.name.trim().length < 2) errors.name = true;
  if (!normalizeBurundiPhone(customer.phone)) errors.phone = true;
  if (!customer.city.trim()) errors.city = true;
  if (!customer.district.trim()) errors.district = true;
  if (!lines.some((l) => l.quantity > 0)) errors.cart = true;
  return errors;
}

export function orderSubtotal(lines: OrderLine[]): number | null {
  if (lines.some((l) => l.unitPrice === null)) return null;
  return lines.reduce((sum, l) => sum + (l.unitPrice ?? 0) * l.quantity, 0);
}

/**
 * Formats a BIF amount, e.g. 16800 → "16 800 FBu".
 *
 * Deliberately not `Intl.NumberFormat`: its grouping for some locales (observed
 * with "rn") differs between Node (server render) and the browser (hydration),
 * producing a different string on each side and crashing hydration (React
 * error #418). A fixed, manual grouping renders the exact same text everywhere
 * regardless of locale or JS engine/ICU data.
 */
export function formatPrice(amount: number): string {
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  return `${grouped} FBu`;
}

/** Localized message fragments (from content/site.*.json → order.whatsapp). */
export interface WhatsAppTemplate {
  greeting: string;
  line: (v: { quantity: number; name: string }) => string;
  subtotal: (v: { amount: string }) => string;
  customer: (v: { name: string }) => string;
  phone: (v: { phone: string }) => string;
  address: (v: { district: string; city: string }) => string;
  notes: (v: { notes: string }) => string;
  payment: (v: { method: string }) => string;
  thanks: string;
}

export function buildOrderMessage(order: OrderDraft, template: WhatsAppTemplate, paymentLabel: string) {
  const { customer } = order;
  const phone = normalizeBurundiPhone(customer.phone);
  const subtotal = orderSubtotal(order.lines);
  const parts = [
    template.greeting,
    "",
    ...order.lines.filter((l) => l.quantity > 0).map((l) => template.line({ quantity: l.quantity, name: l.name })),
    ...(subtotal !== null ? ["", template.subtotal({ amount: formatPrice(subtotal) })] : []),
    "",
    template.customer({ name: customer.name.trim() }),
    template.phone({ phone: phone ? formatBurundiPhone(phone) : customer.phone.trim() }),
    template.address({ district: customer.district.trim(), city: customer.city.trim() }),
    ...(customer.notes.trim() ? [template.notes({ notes: customer.notes.trim() })] : []),
    template.payment({ method: paymentLabel }),
    "",
    template.thanks,
  ];
  return parts.join("\n");
}

/** wa.me link; `number` must be digits only with country code (e.g. 25762697087). */
export function whatsappUrl(number: string, text?: string): string {
  const digits = number.replace(/\D/g, "");
  return text ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/${digits}`;
}
