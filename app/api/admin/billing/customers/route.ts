import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDeveloperAdmin } from "@/lib/admin";
import { activateSubscriptionById, createPendingSubscription } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { rejectCrossSiteMutation } from "@/lib/security";

const schema = z.object({
  userId: z.string().min(1),
  planName: z.enum(["Gratuito", "Pro", "Business", "Enterprise"]),
  days: z.number().int().min(1).max(3650).default(30),
});

export async function PATCH(request: Request) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const admin = await requireDeveloperAdmin();
  if (!admin) return NextResponse.json({ success: false }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Dados inválidos." }, { status: 400 });

  const [user, plan, current] = await Promise.all([
    prisma.user.findUnique({ where: { id: parsed.data.userId } }),
    prisma.plan.findUnique({ where: { name: parsed.data.planName } }),
    prisma.subscription.findFirst({
      where: { userId: parsed.data.userId, status: { in: ["ACTIVE", "PAST_DUE"] } },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!user || !plan) return NextResponse.json({ success: false, message: "Cliente ou plano não encontrado." }, { status: 404 });

  if (current?.provider === "MERCADO_PAGO" && current.plan.name !== "Gratuito") {
    return NextResponse.json({
      success: false,
      message: "Este cliente possui cobrança recorrente ativa no Mercado Pago. Cancele/sincronize a assinatura antes de conceder outro plano manualmente.",
    }, { status: 409 });
  }

  const pending = await createPendingSubscription({
    userId: user.id,
    planId: plan.id,
    provider: "ADMIN",
    externalReference: `grant_${Date.now()}_${user.id}`,
  });
  const activeUntil = plan.name === "Gratuito" ? null : new Date(Date.now() + parsed.data.days * 24 * 60 * 60 * 1000);
  const subscription = await activateSubscriptionById(pending.id, {
    activeUntil,
    currentPeriodEnd: activeUntil,
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "SYSTEM",
      title: `Plano ${plan.name} liberado`,
      message: plan.name === "Gratuito"
        ? "Seu plano foi ajustado para Gratuito."
        : `O administrador liberou ${plan.name} por ${parsed.data.days} dias.`,
    },
  });

  return NextResponse.json({
    success: true,
    message: `${plan.name} liberado para ${user.email}.`,
    subscription: { id: subscription.id, activeUntil: subscription.activeUntil },
  });
}
