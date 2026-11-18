/**
 * Payment providers.
 *
 * Today every order is sent through WhatsApp and paid on delivery ("cash").
 * Mobile money (Lumicash, EcoCash) is prepared behind this interface: to plug
 * one in, implement `initiate` (usually by calling a server Route Handler such
 * as app/api/payments/[provider]/route.ts that talks to the operator API with
 * secret credentials kept in environment variables), then set `available: true`.
 */
import type { OrderDraft } from "./types";

export type PaymentMethodId = "cash" | "lumicash" | "ecocash";

export type PaymentResult =
  | { status: "deferred" } // paid later (delivery / WhatsApp confirmation)
  | { status: "pending"; reference: string; instructions?: string }
  | { status: "failed"; error: string };

export interface PaymentProvider {
  id: PaymentMethodId;
  available: boolean;
  initiate(order: OrderDraft): Promise<PaymentResult>;
}

const notConfigured = (id: PaymentMethodId): PaymentProvider => ({
  id,
  available: false,
  async initiate() {
    return { status: "failed", error: `${id}-not-configured` };
  },
});

export const PAYMENT_PROVIDERS: Record<PaymentMethodId, PaymentProvider> = {
  cash: {
    id: "cash",
    available: true,
    async initiate() {
      return { status: "deferred" };
    },
  },
  lumicash: notConfigured("lumicash"),
  ecocash: notConfigured("ecocash"),
};

export const PAYMENT_METHOD_IDS = Object.keys(PAYMENT_PROVIDERS) as PaymentMethodId[];
