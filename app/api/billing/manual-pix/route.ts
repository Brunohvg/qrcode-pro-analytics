import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { createPendingSubscription, getBillingSettings } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { rejectCrossSiteMutation } from "@/lib/security";

const ALLOWED_PLANS = new Set(["Pro", "Business"]);

export async function POST(request: Request) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;

  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false, message: "Faça login para continuar." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const planName = typeof body?.planName === "string" ? body.planName : "";
  if (!ALLOWED_PLANS.has(planName)) {
    return NextResponse.json({ success: false, message: "Plano inválido." }, { status: 400 });
  }

  const [settings, plan] = await Promise.all([
    getBillingSettings(),
    prisma.plan.findUnique({ where: { name: planName } }),
  ]);
  if (!plan) return NextResponse.json({ success: false, message: "Plano não encontrado." }, { status: 404 });
  if (!settings.manualPixEnabled || !settings.pixKey) {
    return NextResponse.json({ success: false, message: "PIX manual não está disponível." }, { status: 503 });
  }

  const existing = await prisma.payment.findFirst({
    where: {
      userId: auth.userId,
      planId: plan.id,
      provider: "MANUAL_PIX",
      status: { in: ["PENDING", "IN_REVIEW"] },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    include: { subscription: true },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return NextResponse.json({
      success: true,
      reused: true,
      payment: serialize(existing),
      pix: publicPix(settings),
    });
  }

  const externalReference = `qrpix_${auth.userId}_${nanoid(12)}`;
  const subscription = await createPendingSubscription({
    userId: auth.userId,
    planId: plan.id,
    provider: "MANUAL_PIX",
    externalReference,
  });

  const payment = await prisma.payment.create({
    data: {
      userId: auth.userId,
      planId: plan.id,
      subscriptionId: subscription.id,
      provider: "MANUAL_PIX",
      externalReference,
      status: "IN_REVIEW",
      method: "pix_fixed_key",
      amount: plan.price,
      description: `QR Metrics Pro - ${plan.name}`,
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json({
    success: true,
    payment: serialize(payment),
    pix: publicPix(settings),
    message: "Pedido de PIX criado. Após o pagamento, a liberação será aprovada no painel administrativo.",
  }, { status: 201 });
}

function serialize(payment: {
  id: string;
  externalReference: string;
  amount: unknown;
  status: string;
  dueAt: Date | null;
}) {
  return {
    id: payment.id,
    externalReference: payment.externalReference,
    amount: String(payment.amount),
    status: payment.status,
    dueAt: payment.dueAt?.toISOString() ?? null,
  };
}

function publicPix(settings: {
  pixKey: string | null;
  pixKeyType: string | null;
  pixRecipientName: string | null;
  pixCity: string | null;
  manualPixInstructions: string | null;
}) {
  return {
    key: settings.pixKey,
    keyType: settings.pixKeyType,
    recipientName: settings.pixRecipientName,
    city: settings.pixCity,
    instructions: settings.manualPixInstructions,
  };
}
