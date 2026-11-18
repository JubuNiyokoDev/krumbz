import type { PaymentMethodId } from "./payment";

export interface OrderLine {
  id: string;
  name: string;
  quantity: number;
  /** Unit price in BIF, null while unknown. */
  unitPrice: number | null;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  city: string;
  district: string;
  notes: string;
}

export interface OrderDraft {
  lines: OrderLine[];
  customer: CustomerInfo;
  payment: PaymentMethodId;
}

export type OrderErrors = Partial<Record<"name" | "phone" | "city" | "district" | "cart", true>>;
