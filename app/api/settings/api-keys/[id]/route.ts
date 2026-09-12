import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossSiteMutation } from "@/lib/security";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Context) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const { id } = await params;
  const item = await prisma.apiKey.findFirst({ where: { id, userId: auth.userId }, select: { id: true } });
  if (!item) return NextResponse.json({ success: false, message: "Chave não encontrada." }, { status: 404 });
  await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  return NextResponse.json({ success: true });
}
