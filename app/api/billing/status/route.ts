import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { getBillingSettings } from "@/lib/billing";
import { mercadoPagoConfigured } from "@/lib/mercado-pago";
import { getActiveSubscription } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });

  const [subscription, settings, payments] = await Promise.all([
    getActiveSubscription(auth.userId),
    getBillingSettings(),
    prisma.payment.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { plan: { select: { name: true } } },
    }),
  ]);

  return NextResponse.json({
    success: true,
    subscription: {
      id: subscription.id,
      status: subscription.status,
      provider: subscription.provider,
      activeUntil: subscription.activeUntil,
      graceUntil: subscription.graceUntil,
      plan: {
        name: subscription.plan.name,
        price: subscription.plan.price.toString(),
      },
    },
    paymentOptions: {
      mercadoPago: settings.mercadoPagoEnabled && mercadoPagoConfigured(),
      manualPix: settings.manualPixEnabled && Boolean(settings.pixKey),
      pix: settings.manualPixEnabled && settings.pixKey ? {
        key: settings.pixKey,
        keyType: settings.pixKeyType,
        recipientName: settings.pixRecipientName,
        city: settings.pixCity,
        instructions: settings.manualPixInstructions,
      } : null,
    },
    payments: payments.map((payment) => ({
      id: payment.id,
      provider: payment.provider,
      status: payment.status,
      providerStatus: payment.providerStatus,
      amount: payment.amount.toString(),
      method: payment.method,
      externalReference: payment.externalReference,
      paidAt: payment.paidAt,
      dueAt: payment.dueAt,
      createdAt: payment.createdAt,
      planName: payment.plan.name,
    })),
  });
}
