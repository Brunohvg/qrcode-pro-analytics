import { resolveTxt } from "node:dns/promises";
import { NextResponse } from "next/server";
import { getAuthClaims } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossSiteMutation } from "@/lib/security";

type Context = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, { params }: Context) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const { id } = await params;

  const item = await prisma.customDomain.findFirst({ where: { id, userId: auth.userId } });
  if (!item) return NextResponse.json({ success: false, message: "Domínio não encontrado." }, { status: 404 });

  try {
    const records = await resolveTxt(`_qrmetrics.${item.host}`);
    const values = records.map((parts) => parts.join(""));
    if (!values.includes(item.verificationToken)) {
      return NextResponse.json({ success: false, message: "Registro TXT ainda não encontrado. Aguarde a propagação do DNS." }, { status: 409 });
    }
    const updated = await prisma.customDomain.update({ where: { id }, data: { verifiedAt: new Date() } });
    return NextResponse.json({ success: true, item: updated });
  } catch {
    return NextResponse.json({ success: false, message: "Não foi possível localizar o registro TXT. Verifique o DNS e tente novamente." }, { status: 409 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const blocked = rejectCrossSiteMutation(request);
  if (blocked) return blocked;
  const auth = await getAuthClaims();
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const { id } = await params;
  const deleted = await prisma.customDomain.deleteMany({ where: { id, userId: auth.userId } });
  if (!deleted.count) return NextResponse.json({ success: false, message: "Domínio não encontrado." }, { status: 404 });
  return NextResponse.json({ success: true });
}
