import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { createPendingSubscription, getBillingSettings } from "@/lib/billing";
import { createMercadoPagoSubscription, mercadoPagoConfigured } from "@/lib/mercado-pago";
import { prisma } from "@/lib/prisma";
import { getPublicOrigin } from "@/lib/public-url";
import { rejectCrossSiteMutation } from "@/lib/security";

const ALLOWED_PLANS = new Set(["Pro", "Business"]);

export async function POST(request: Request) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;

  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false, message: "Faça login para assinar." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const planName = typeof body?.planName === "string" ? body.planName : "";
  if (!ALLOWED_PLANS.has(planName)) {
    return NextResponse.json({ success: false, message: "Plano indisponível para checkout automático." }, { status: 400 });
  }

  const [settings, plan] = await Promise.all([
    getBillingSettings(),
    prisma.plan.findUnique({ where: { name: planName } }),
  ]);
  if (!plan) return NextResponse.json({ success: false, message: "Plano não encontrado." }, { status: 404 });
  if (!settings.mercadoPagoEnabled || !mercadoPagoConfigured()) {
    return NextResponse.json({ success: false, message: "Mercado Pago ainda não está habilitado neste ambiente." }, { status: 503 });
  }

  const recentPending = await prisma.subscription.findFirst({
    where: {
      userId: auth.userId,
      planId: plan.id,
      provider: "MERCADO_PAGO",
      status: "PENDING",
      checkoutUrl: { not: null },
      createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recentPending?.checkoutUrl) {
    return NextResponse.json({ success: true, checkoutUrl: recentPending.checkoutUrl, subscriptionId: recentPending.id, reused: true });
  }

  const externalReference = `qrmp_${auth.userId}_${nanoid(12)}`;
  const local = await createPendingSubscription({
    userId: auth.userId,
    planId: plan.id,
    provider: "MERCADO_PAGO",
    externalReference,
  });

  try {
    const origin = getPublicOrigin(request).replace(/\/$/, "");
    const remote = await createMercadoPagoSubscription({
      reason: `QR Metrics Pro - ${plan.name}`,
      externalReference,
      payerEmail: auth.email,
      amount: Number(plan.price),
      backUrl: `${origin}/billing?checkout=retorno`,
    });

    if (!remote.id || !remote.init_point) {
      throw new Error("Mercado Pago não retornou o link de checkout.");
    }

    await prisma.subscription.update({
      where: { id: local.id },
      data: {
        providerSubscriptionId: remote.id,
        checkoutUrl: remote.init_point,
      },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: remote.init_point,
      subscriptionId: local.id,
      providerSubscriptionId: remote.id,
    });
  } catch (error) {
    await prisma.subscription.update({
      where: { id: local.id },
      data: { status: "CANCELED" },
    }).catch(() => null);

    console.error("MERCADO_PAGO_CHECKOUT_ERROR", error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Não foi possível iniciar o checkout.",
    }, { status: 502 });
  }
}
