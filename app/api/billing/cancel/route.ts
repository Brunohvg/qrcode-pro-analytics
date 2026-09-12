import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { cancelMercadoPagoPreapproval } from "@/lib/mercado-pago";
import { prisma } from "@/lib/prisma";
import { rejectCrossSiteMutation } from "@/lib/security";

export async function POST(request: Request) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;

  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });

  const subscription = await prisma.subscription.findFirst({
    where: { userId: auth.userId, status: { in: ["ACTIVE", "PAST_DUE"] } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription || subscription.plan.name === "Gratuito") {
    return NextResponse.json({ success: false, message: "Não há assinatura paga para cancelar." }, { status: 400 });
  }

  if (subscription.provider === "MERCADO_PAGO" && subscription.providerSubscriptionId) {
    try {
      await cancelMercadoPagoPreapproval(subscription.providerSubscriptionId);
    } catch (error) {
      console.error("MERCADO_PAGO_CANCEL_ERROR", error);
      return NextResponse.json({ success: false, message: "O Mercado Pago não confirmou o cancelamento." }, { status: 502 });
    }
  }

  const now = new Date();
  const keepUntilEnd = Boolean(subscription.activeUntil && subscription.activeUntil > now);
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: keepUntilEnd
      ? { status: "ACTIVE", cancelAtPeriodEnd: true }
      : { status: "CANCELED", cancelAtPeriodEnd: false },
  });

  return NextResponse.json({
    success: true,
    message: keepUntilEnd
      ? `Cobrança recorrente cancelada. Seu plano continua ativo até ${subscription.activeUntil!.toLocaleDateString("pt-BR")}.`
      : "Assinatura cancelada. O plano gratuito será aplicado no próximo acesso.",
  });
}
