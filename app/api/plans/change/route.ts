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

  const parsed = changePlanSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, message: "Plano inválido." }, { status: 400 });
  if (parsed.data.planName === "Enterprise") {
    return NextResponse.json({ success: false, message: "O plano Enterprise é contratado sob consulta e não pode ser ativado pelo checkout de demonstração." }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({ where: { name: parsed.data.planName } });
  if (!plan) return NextResponse.json({ success: false, message: "Plano indisponível." }, { status: 404 });

  const subscription = await prisma.$transaction(async (tx) => {
    await tx.subscription.updateMany({
      where: { userId: auth.userId, status: "ACTIVE" },
      data: { status: "CANCELED" },
    });
    return tx.subscription.create({
      data: {
        userId: auth.userId,
        planId: plan.id,
        status: "ACTIVE",
        activeUntil: parsed.data.planName === "Gratuito" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      include: { plan: true },
    });
  });

  return NextResponse.json({
    success: true,
    message: `Checkout simulado concluído. Plano ${subscription.plan.name} ativado por 30 dias.`,
    plan: { name: subscription.plan.name, price: subscription.plan.price.toString() },
  });
}
