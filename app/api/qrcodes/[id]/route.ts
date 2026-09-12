import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { rejectCrossSiteMutation } from "@/lib/security";
import { updateQrSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.qRCode.findFirst({ where: { id, userId: auth.userId }, select: { id: true } });
  if (!existing) return NextResponse.json({ success: false, message: "QR Code não encontrado." }, { status: 404 });

  const parsed = updateQrSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Dados inválidos." }, { status: 400 });
  }

  if (parsed.data.originalUrl !== undefined) {
    const subscription = await getActiveSubscription(auth.userId);
    if (!subscription.plan.dynamicLinks) {
      return NextResponse.json({ success: false, message: "Seu plano não permite alterar links dinâmicos." }, { status: 403 });
    }
  }

  const item = await prisma.qRCode.update({
    where: { id },
    data: parsed.data,
    select: { id: true, name: true, originalUrl: true, slug: true, scanCount: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({ success: true, item });
}

export async function DELETE(request: Request, { params }: Context) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const { id } = await params;

  const deleted = await prisma.qRCode.deleteMany({ where: { id, userId: auth.userId } });
  if (deleted.count === 0) {
    return NextResponse.json({ success: false, message: "QR Code não encontrado." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
