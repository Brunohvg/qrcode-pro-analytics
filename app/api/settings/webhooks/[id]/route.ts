import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossSiteMutation } from "@/lib/security";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { active?: unknown } | null;
  if (typeof body?.active !== "boolean") return NextResponse.json({ success: false, message: "Estado inválido." }, { status: 400 });
  const existing = await prisma.webhook.findFirst({ where: { id, userId: auth.userId }, select: { id: true } });
  if (!existing) return NextResponse.json({ success: false, message: "Webhook não encontrado." }, { status: 404 });
  const item = await prisma.webhook.update({
    where: { id },
    data: { active: body.active },
    select: { id: true, name: true, url: true, active: true, updatedAt: true },
  });
  return NextResponse.json({ success: true, item });
}

export async function DELETE(request: Request, { params }: Context) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const { id } = await params;
  const deleted = await prisma.webhook.deleteMany({ where: { id, userId: auth.userId } });
  if (!deleted.count) return NextResponse.json({ success: false, message: "Webhook não encontrado." }, { status: 404 });
  return NextResponse.json({ success: true });
}
