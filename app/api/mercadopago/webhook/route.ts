import { NextResponse } from "next/server";
import {
  activateSubscriptionById,
  mapPaymentStatus,
  markSubscriptionPastDue,
} from "@/lib/billing";
import {
  getMercadoPagoAuthorizedPayment,
  getMercadoPagoPayment,
  getMercadoPagoPreapproval,
  mercadoPagoWebhookConfigured,
  validateMercadoPagoWebhookSignature,
} from "@/lib/mercado-pago";
import { prisma } from "@/lib/prisma";

type WebhookBody = {
  id?: string | number;
  action?: string;
  type?: string;
  date_created?: string;
  data?: { id?: string | number };
};

export async function POST(request: Request) {
  if (!mercadoPagoWebhookConfigured()) {
    return NextResponse.json({ success: false, message: "Webhook não configurado." }, { status: 503 });
  }

  const url = new URL(request.url);
  const body = await request.json().catch(() => ({} as WebhookBody)) as WebhookBody;
  const dataId = url.searchParams.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : null);
  const type = url.searchParams.get("type") ?? body.type ?? "unknown";

  const valid = validateMercadoPagoWebhookSignature({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId,
  });
  if (!valid) return NextResponse.json({ success: false }, { status: 401 });

  const eventId = String(body.id ?? `${type}:${body.action ?? "event"}:${dataId ?? "none"}:${body.date_created ?? "unknown"}`);
  const existing = await prisma.billingWebhookEvent.findUnique({ where: { providerEventId: eventId } });
  if (existing?.processedAt) return NextResponse.json({ success: true, duplicate: true });

  const event = existing ?? await prisma.billingWebhookEvent.create({
    data: {
      provider: "MERCADO_PAGO",
      providerEventId: eventId,
      eventType: type,
      resourceId: dataId,
      payload: JSON.parse(JSON.stringify(body)),
    },
  });

  try {
    if (dataId) {
      if (type === "subscription_preapproval") {
        await syncPreapproval(dataId);
      } else if (type === "payment") {
        await syncPayment(dataId);
      } else if (type === "subscription_authorized_payment") {
        await syncAuthorizedPayment(dataId);
      }
    }

    await prisma.billingWebhookEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("MERCADO_PAGO_WEBHOOK_ERROR", { type, dataId, error });
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

async function syncPreapproval(id: string) {
  const remote = await getMercadoPagoPreapproval(id);
  const local = await prisma.subscription.findFirst({
    where: {
      OR: [
        { providerSubscriptionId: remote.id },
        ...(remote.external_reference ? [{ externalReference: remote.external_reference }] : []),
      ],
    },
  });
  if (!local) return;

  const status = (remote.status ?? "").toLowerCase();
  const nextPayment = remote.next_payment_date ? new Date(remote.next_payment_date) : null;

  await prisma.subscription.update({
    where: { id: local.id },
    data: {
      providerSubscriptionId: remote.id,
      checkoutUrl: remote.init_point ?? undefined,
    },
  });

  if (status === "authorized") {
    await activateSubscriptionById(
      local.id,
      nextPayment
        ? {
            currentPeriodStart: local.currentPeriodStart ?? new Date(),
            currentPeriodEnd: nextPayment,
            activeUntil: nextPayment,
          }
        : { currentPeriodStart: local.currentPeriodStart ?? new Date() },
    );
  } else if (status === "cancelled" || status === "canceled") {
    const now = new Date();
    const stillPaid = Boolean(local.activeUntil && local.activeUntil > now);
    await prisma.subscription.update({
      where: { id: local.id },
      data: stillPaid
        ? { status: "ACTIVE", cancelAtPeriodEnd: true }
        : { status: "CANCELED", cancelAtPeriodEnd: false },
    });
  } else if (status === "paused") {
    await markSubscriptionPastDue(local.id);
  } else if (local.status !== "ACTIVE" && local.status !== "PAST_DUE") {
    await prisma.subscription.update({ where: { id: local.id }, data: { status: "PENDING" } });
  }
}

async function syncPayment(id: string) {
  const payment = await getMercadoPagoPayment(id);
  const providerPaymentId = String(payment.id);
  const externalReference = payment.external_reference ?? "";
  const local = externalReference
    ? await prisma.subscription.findFirst({ where: { externalReference }, include: { plan: true } })
    : null;

  if (!local) return;

  const mapped = mapPaymentStatus(payment.status);
  await prisma.payment.upsert({
    where: { providerPaymentId },
    update: {
      status: mapped,
      providerStatus: payment.status ?? null,
      method: payment.payment_method_id ?? payment.payment_type_id ?? null,
      paidAt: payment.date_approved ? new Date(payment.date_approved) : mapped === "APPROVED" ? new Date() : null,
    },
    create: {
      userId: local.userId,
      planId: local.planId,
      subscriptionId: local.id,
      provider: "MERCADO_PAGO",
      providerPaymentId,
      externalReference: externalReference || `mp_payment_${providerPaymentId}`,
      status: mapped,
      providerStatus: payment.status ?? null,
      method: payment.payment_method_id ?? payment.payment_type_id ?? null,
      amount: payment.transaction_amount ?? local.plan.price,
      currency: payment.currency_id ?? "BRL",
      description: `QR Metrics Pro - ${local.plan.name}`,
      paidAt: payment.date_approved ? new Date(payment.date_approved) : mapped === "APPROVED" ? new Date(payment.date_approved) : null,
    },
  });

  if (mapped === "APPROVED") {
    if (local.providerSubscriptionId) {
      await syncPreapproval(local.providerSubscriptionId);
    } else {
      await activateSubscriptionById(local.id);
    }
  } else if (mapped === "REJECTED") {
    await markSubscriptionPastDue(local.id);
  }
}

async function syncAuthorizedPayment(id: string) {
  const invoice = await getMercadoPagoAuthorizedPayment(id);
  const preapprovalId = typeof invoice.preapproval_id === "string" ? invoice.preapproval_id : null;
  if (preapprovalId) await syncPreapproval(preapprovalId);

  const payment = invoice.payment;
  if (payment && typeof payment === "object") {
    const paymentId = (payment as Record<string, unknown>).id;
    if (paymentId != null) await syncPayment(String(paymentId));
  }
}
