import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { rejectCrossSiteMutation } from "@/lib/security";
import { campaignSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const subscription = await getActiveSubscription(auth.userId);
  if (!subscription.plan.campaigns) return NextResponse.json({ success: false, message: "Recurso indisponível no plano atual." }, { status: 403 });

  const parsed = campaignSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, message: "Dados inválidos." }, { status: 400 });
  const { id } = await params;
  const existing = await prisma.campaign.findFirst({ where: { id, userId: auth.userId }, select: { id: true } });
  if (!existing) return NextResponse.json({ success: false, message: "Campanha não encontrada." }, { status: 404 });

  const item = await prisma.campaign.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      color: parsed.data.color,
    },
    include: { _count: { select: { qrCodes: true } } },
  });
  return NextResponse.json({ success: true, item });
}

export async function DELETE(request: Request, { params }: Context) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const { id } = await params;

  const deleted = await prisma.campaign.deleteMany({ where: { id, userId: auth.userId } });
  if (!deleted.count) return NextResponse.json({ success: false, message: "Campanha não encontrada." }, { status: 404 });
  return NextResponse.json({ success: true });
}
