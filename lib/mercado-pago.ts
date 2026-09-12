import { createHmac, timingSafeEqual } from "node:crypto";

const API_BASE = "https://api.mercadopago.com";

function accessToken(): string {
  const value = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (!value) throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado.");
  return value;
}

async function mpFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.message === "string"
        ? payload.message
        : `Mercado Pago respondeu HTTP ${response.status}.`;
    throw new Error(message);
  }
  return payload as T;
}

export type MercadoPagoPreapproval = {
  id: string;
  status: string;
  external_reference?: string | null;
  init_point?: string | null;
  next_payment_date?: string | null;
  payer_id?: number | null;
  payment_method_id?: string | null;
  auto_recurring?: {
    transaction_amount?: number | string | null;
    currency_id?: string | null;
  } | null;
};

export type MercadoPagoPayment = {
  id: number | string;
  status?: string | null;
  status_detail?: string | null;
  external_reference?: string | null;
  payment_method_id?: string | null;
  payment_type_id?: string | null;
  date_approved?: string | null;
  transaction_amount?: number | null;
  currency_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function createMercadoPagoSubscription(input: {
  reason: string;
  externalReference: string;
  payerEmail: string;
  amount: number;
  backUrl: string;
}): Promise<MercadoPagoPreapproval> {
  return mpFetch<MercadoPagoPreapproval>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: input.reason,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: input.amount,
        currency_id: "BRL",
      },
      back_url: input.backUrl,
      status: "pending",
    }),
  });
}

export function getMercadoPagoPreapproval(id: string) {
  return mpFetch<MercadoPagoPreapproval>(`/preapproval/${encodeURIComponent(id)}`);
}

export function cancelMercadoPagoPreapproval(id: string) {
  return mpFetch<MercadoPagoPreapproval>(`/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });
}

export function getMercadoPagoPayment(id: string) {
  return mpFetch<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(id)}`);
}

export async function getMercadoPagoAuthorizedPayment(id: string): Promise<Record<string, unknown>> {
  return mpFetch<Record<string, unknown>>(`/authorized_payments/${encodeURIComponent(id)}`);
}

export function validateMercadoPagoWebhookSignature(input: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
  if (!secret || !input.xSignature) return false;

  const parts = new Map<string, string>();
  for (const part of input.xSignature.split(",")) {
    const [rawKey, ...rest] = part.split("=");
    const key = rawKey?.trim();
    const value = rest.join("=").trim();
    if (key && value) parts.set(key, value);
  }

  const ts = parts.get("ts");
  const received = parts.get("v1");
  if (!ts || !received || !/^[0-9a-f]{64}$/i.test(received)) return false;

  let manifest = "";
  if (input.dataId) manifest += `id:${input.dataId};`;
  if (input.xRequestId) manifest += `request-id:${input.xRequestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(received, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function mercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim());
}

export function mercadoPagoWebhookConfigured(): boolean {
  return Boolean(process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim());
}
