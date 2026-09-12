import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossSiteMutation } from "@/lib/security";
import { changePlanSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false, message: "Faça login para escolher um plano." }, { status: 401 });

  const parsed = changePlanSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Plano inválido." }, { status: 400 });

  if (parsed.data.planName !== "Gratuito") {
    return NextResponse.json({
      success: false,
      message: "Planos pagos são ativados somente após confirmação de pagamento. Use a página de assinatura.",
      billingUrl: `/billing?plan=${encodeURIComponent(parsed.data.planName)}`,
    }, { status: 402 });
  }

  const current = await prisma.subscription.findFirst({
    where: { userId: auth.userId, status: { in: ["ACTIVE", "PAST_DUE"] } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  if (current?.provider === "MERCADO_PAGO" && current.plan.name !== "Gratuito") {
    return NextResponse.json({
      success: false,
      message: "Cancele a assinatura recorrente pela página de cobrança antes de mudar para o Gratuito.",
      billingUrl: "/billing",
    }, { status: 409 });
  }

  const plan = await prisma.plan.findUnique({ where: { name: "Gratuito" } });
  if (!plan) return NextResponse.json({ success: false, message: "Plano gratuito indisponível." }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.subscription.updateMany({
      where: { userId: auth.userId, status: { in: ["ACTIVE", "PAST_DUE"] } },
      data: { status: "CANCELED" },
    });
    await tx.subscription.create({
      data: {
        userId: auth.userId,
        planId: plan.id,
        status: "ACTIVE",
        provider: "ADMIN",
      },
    });
  });

  return NextResponse.json({ success: true, message: "Plano Gratuito ativado." });
}
