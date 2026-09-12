import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDeveloperAdmin } from "@/lib/admin";
import { activateSubscriptionById } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { rejectCrossSiteMutation } from "@/lib/security";

const schema = z.object({
  paymentId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(),
});

export async function PATCH(request: Request) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const admin = await requireDeveloperAdmin();
  if (!admin) return NextResponse.json({ success: false }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Ação inválida." }, { status: 400 });

  const payment = await prisma.payment.findUnique({
    where: { id: parsed.data.paymentId },
    include: { subscription: true, plan: true, user: true },
  });
  if (!payment || payment.provider !== "MANUAL_PIX") {
    return NextResponse.json({ success: false, message: "Pagamento PIX manual não encontrado." }, { status: 404 });
  }
  if (!payment.subscriptionId) {
    return NextResponse.json({ success: false, message: "Pagamento sem assinatura vinculada." }, { status: 409 });
  }

  if (parsed.data.action === "approve") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "APPROVED",
        providerStatus: "approved_by_admin",
        paidAt: new Date(),
        reviewedAt: new Date(),
        reviewNote: parsed.data.note || `Aprovado por ${admin.email}`,
      },
    });
    const subscription = await activateSubscriptionById(payment.subscriptionId);
    await prisma.notification.create({
      data: {
        userId: payment.userId,
        type: "SYSTEM",
        title: `${subscription.plan.name} liberado`,
        message: "Seu pagamento PIX foi aprovado e os recursos do plano já estão disponíveis.",
      },
    });
    return NextResponse.json({ success: true, message: "Pagamento aprovado e plano liberado." });
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "REJECTED",
        providerStatus: "rejected_by_admin",
        reviewedAt: new Date(),
        reviewNote: parsed.data.note || `Recusado por ${admin.email}`,
      },
    }),
    prisma.subscription.update({
      where: { id: payment.subscriptionId },
      data: { status: "CANCELED" },
    }),
    prisma.notification.create({
      data: {
        userId: payment.userId,
        type: "SYSTEM",
        title: "Pagamento PIX precisa de revisão",
        message: parsed.data.note || "Não conseguimos confirmar o pagamento. Entre em contato com o suporte.",
      },
    }),
  ]);

  return NextResponse.json({ success: true, message: "Pagamento recusado." });
}
